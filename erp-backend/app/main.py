from __future__ import annotations

from typing import List

from fastapi import Depends, FastAPI, File, HTTPException, Query, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app import crud, schemas
from sqlalchemy.exc import IntegrityError
from app.database import init_db
from app.dependencies import get_db
from app.services.image_processing import (
    MEDIA_ROOT,
    ImageProcessingError,
    convert_many_to_webp,
)
from app.auth import verify_password, create_token_for_user, decode_access_token, get_password_hash
from sqlalchemy.orm import Session
from fastapi import Depends, Header

app = FastAPI(title="Menju Backend", version="0.2.0")
app.mount("/media/products", StaticFiles(directory=MEDIA_ROOT), name="product-media")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
        "http://0.0.0.0:5173",
        "http://backend:8000",
    ],
    allow_origin_regex=r"http://(127\.0\.0\.1|0\.0\.0\.0|localhost|10\.\d+\.\d+\.\d+|172\.1[6-9]\.\d+\.\d+|172\.2[0-9]\.\d+\.\d+|172\.3[0-1]\.\d+\.\d+|192\.168\.\d+\.\d+):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup() -> None:
    init_db()


# Produtos
@app.post("/products", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
def create_product(
    product: schemas.ProductCreate, db: Session = Depends(get_db)
) -> schemas.Product:
    if crud.get_product_by_sku(db, product.sku):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SKU already registered",
        )
    return crud.create_product(db, product)


@app.get("/products", response_model=List[schemas.Product])
def read_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    sku: str | None = Query(None),
    name: str | None = Query(None),
    db: Session = Depends(get_db),
) -> List[schemas.Product]:
    return crud.list_products(db, skip=skip, limit=limit, sku=sku, name=name)


@app.get("/reports/products", response_model=schemas.ProductsReport)
def read_products_report(
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    sku: str | None = Query(None),
    name: str | None = Query(None),
    category: str | None = Query(None),
    db: Session = Depends(get_db),
) -> schemas.ProductsReport:
    report = crud.list_products_report(db, from_date=from_date, to_date=to_date, skip=skip, limit=limit, sku=sku, name=name, category=category)
    # Convert Decimal totals to floats for JSON serialization via pydantic
    totals = report["totals"]
    totals_serial = {
        "total_products": totals["total_products"],
        "total_cost": float(totals["total_cost"]),
        "total_sale": float(totals["total_sale"]),
    }
    return {"products": report["products"], "totals": totals_serial}


# --- Authentication endpoints (basic JWT) ---
@app.post("/auth/token", response_model=schemas.Token)
def login_for_access_token(form_data: dict, db: Session = Depends(get_db)):
    # form_data expected to contain 'username' and 'password'
    username = form_data.get("username")
    password = form_data.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password required")
    user = crud.get_user_by_email(db, username)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # no rehash on login; password hashing remains handled at creation/time of change

    token = create_token_for_user(user)
    return {"access_token": token, "token_type": "bearer"}


@app.post('/auth/signup', response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def signup_endpoint(payload: dict, db: Session = Depends(get_db)):
    # payload expected to contain 'email' and 'password'
    email = payload.get('email')
    password = payload.get('password')
    if not email or not password:
        raise HTTPException(status_code=400, detail='email and password required')
    # Create an isolated tenant for this user so accounts don't share the same DB tenant data.
    # If the caller provides tenant_name/tenant_slug, we could use it; otherwise generate one.
    import re
    import uuid

    def _slugify(s: str) -> str:
        s = s.lower()
        s = re.sub(r"[^a-z0-9]+", "-", s)
        s = s.strip("-")
        return s or uuid.uuid4().hex[:6]

    tenant_name = payload.get('tenant_name') or f"{email.split('@')[0]}'s tenant"
    provided_slug = payload.get('tenant_slug')
    if provided_slug:
        tenant_slug = _slugify(provided_slug)
    else:
        # use local part + short random suffix to avoid collisions
        local = email.split('@')[0]
        base = _slugify(local)[:30]
        tenant_slug = f"{base}-{uuid.uuid4().hex[:6]}"

    # create tenant
    try:
        tenant = crud.create_tenant(db, name=tenant_name, slug=tenant_slug)
    except IntegrityError:
        db.rollback()
        # unlikely but if slug already exists, generate a different one
        tenant_slug = f"{tenant_slug}-{uuid.uuid4().hex[:4]}"
        tenant = crud.create_tenant(db, name=tenant_name, slug=tenant_slug)

    pwd_hash = get_password_hash(password)
    try:
        # create the new user as USER by default
        user = crud.create_user(db, email=email, password_hash=pwd_hash, tenant_id=tenant.id, full_name=None, role=crud.models.UserRole.USER)
    except ValueError as exc:
        # cleanup orphan tenant if user cannot be created
        try:
            crud.delete_tenant(db, tenant)
        except Exception:
            pass
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        try:
            crud.delete_tenant(db, tenant)
        except Exception:
            pass
        raise HTTPException(status_code=409, detail='User creation conflict') from exc

    token = create_token_for_user(user)
    return {"access_token": token, "token_type": "bearer", "tenant": {"id": tenant.id, "name": tenant.name, "slug": tenant.slug, "created_at": tenant.created_at.isoformat()}}


# Admin endpoints for tenant/user creation (dev)
@app.post("/tenants", response_model=schemas.Tenant, status_code=status.HTTP_201_CREATED)
def create_tenant_endpoint(tenant: schemas.TenantCreate, db: Session = Depends(get_db)):
    try:
        t = crud.create_tenant(db, name=tenant.name, slug=tenant.slug)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tenant name or slug already exists") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return t


@app.post("/users", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if not user_in.email or not user_in.password or not user_in.tenant_id:
        raise HTTPException(status_code=400, detail="email, password and tenant_id required")
    pwd_hash = get_password_hash(user_in.password)
    try:
        u = crud.create_user(
            db,
            email=user_in.email,
            password_hash=pwd_hash,
            tenant_id=user_in.tenant_id,
            full_name=user_in.full_name,
            role=crud.models.UserRole.USER,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="User or tenant conflict") from exc
    return u


# Registration endpoints (public)
@app.post('/registrations', response_model=schemas.RegistrationOut, status_code=status.HTTP_201_CREATED)
def create_registration_endpoint(payload: dict, db: Session = Depends(get_db)):
    # minimal validation done in frontend; here we persist registration and return id/status
    idemp = payload.get('idempotency_key')
    try:
        reg = crud.create_registration(db, payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return reg


@app.get('/registrations/{reg_id}', response_model=schemas.RegistrationOut)
def get_registration_endpoint(reg_id: int, db: Session = Depends(get_db)):
    reg = crud.get_registration(db, reg_id)
    if not reg:
        raise HTTPException(status_code=404, detail='Registration not found')
    return reg


@app.get("/auth/me")
def read_current_user(authorization: str | None = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    try:
        scheme, token = authorization.split()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    try:
        payload = decode_access_token(token)
    except Exception:
        # Decode errors (expired/invalid token) should be translated to 401
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get('/auth/tenant')
def read_current_tenant(authorization: str | None = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail='Missing authorization header')
    try:
        scheme, token = authorization.split()
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid authorization header')
    payload = decode_access_token(token)
    try:
        user_id = int(payload.get('sub'))
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid token payload')
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    tenant = user.tenant
    if not tenant:
        raise HTTPException(status_code=404, detail='Tenant not found')
    return {"id": tenant.id, "name": tenant.name, "slug": tenant.slug, "created_at": tenant.created_at.isoformat()}


@app.get("/products/{product_id}", response_model=schemas.Product)
def read_product(product_id: int, db: Session = Depends(get_db)) -> schemas.Product:
    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return db_product


@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    product_update: schemas.ProductUpdate,
    db: Session = Depends(get_db),
) -> schemas.Product:
    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if product_update.sku and product_update.sku != db_product.sku:
        existing = crud.get_product_by_sku(db, product_update.sku)
        if existing and existing.id != product_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="SKU already registered",
            )

    return crud.update_product(db, db_product, product_update)


@app.delete("/products/{product_id}", status_code=status.HTTP_200_OK)
def delete_product(product_id: int, db: Session = Depends(get_db)) -> None:
    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    crud.delete_product(db, db_product)
    return {"status": "ok"}



# Upload de fotos de produtos
@app.post("/products/{product_id}/photos", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
async def upload_product_photos(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> schemas.Product:
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum arquivo enviado.",
        )

    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    try:
        saved_paths = await convert_many_to_webp(files, prefix=f"product-{product_id}")
    except ImageProcessingError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    updated_product = crud.append_product_photos(db, db_product, saved_paths)
    return updated_product


@app.delete("/products/{product_id}/photos", response_model=schemas.Product)
def delete_product_photo(
    product_id: int,
    path: str,
    db: Session = Depends(get_db),
) -> schemas.Product:
    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    updated = crud.remove_product_photo(db, db_product, path)
    return updated

# Clientes
@app.post("/customers", response_model=schemas.Customer, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer: schemas.CustomerCreate, db: Session = Depends(get_db)
) -> schemas.Customer:
    # 'document' field removed from Customer model; skip document uniqueness check.
    # Prevent duplicate by phone
    if customer.phone and crud.get_customer_by_phone(db, customer.phone):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cliente já cadastrado.",
        )
    return crud.create_customer(db, customer)


@app.get("/customers", response_model=List[schemas.Customer])
def read_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> List[schemas.Customer]:
    db_customers = crud.list_customers(db, skip=skip, limit=limit)
    out = []
    for c in db_customers:
        try:
            balance = crud.get_customer_balance(db, c.id)
        except Exception:
            balance = 0.0
        cust = schemas.Customer.model_validate(c)
        d = cust.model_dump()
        d["balance_due"] = balance
        out.append(d)
    return out


@app.get("/customers/{customer_id}", response_model=schemas.Customer)
def read_customer(customer_id: int, db: Session = Depends(get_db)) -> schemas.Customer:
    db_customer = crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    try:
        balance = crud.get_customer_balance(db, customer_id)
    except Exception:
        balance = 0.0
    # use pydantic schema to serialize and include balance_due
    cust = schemas.Customer.model_validate(db_customer)
    d = cust.model_dump()
    d["balance_due"] = balance
    return d


@app.put("/customers/{customer_id}", response_model=schemas.Customer)
def update_customer(
    customer_id: int,
    customer_update: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
) -> schemas.Customer:
    db_customer = crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    # 'document' field removed from Customer model; no document uniqueness check.

    return crud.update_customer(db, db_customer, customer_update)


@app.delete("/customers/{customer_id}", status_code=status.HTTP_200_OK)
def delete_customer(customer_id: int, db: Session = Depends(get_db)) -> None:
    db_customer = crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    crud.delete_customer(db, db_customer)


# Vendas
@app.post("/sales", response_model=schemas.Sale, status_code=status.HTTP_201_CREATED)
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db)) -> schemas.Sale:
    try:
        return crud.create_sale(db, sale)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc



@app.post("/customer-payments", status_code=status.HTTP_201_CREATED)
def create_customer_payment(payload: dict, db: Session = Depends(get_db)):
    """Register a payment from a customer and allocate to outstanding fiado sales.

    Payload: { customer_id, amount, method, notes? }
    Returns: { payment: {id, customer_id, method, amount, notes, created_at}, allocations: [{sale_id, amount}], remaining }
    """
    try:
        customer_id = payload.get("customer_id")
        amount = payload.get("amount")
        method = payload.get("method")
        result = crud.create_customer_payment(db, customer_id=customer_id, amount=amount, method=method)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    payment = result["payment"]
    allocations = result["allocations"]
    remaining = result["remaining"]

    payment_out = {
        "id": payment.id,
        "customer_id": payment.customer_id,
        "method": str(payment.method),
        "amount": float(payment.amount),
        "created_at": payment.created_at.isoformat(),
    }

    return {"payment": payment_out, "allocations": allocations, "remaining": remaining}



@app.get("/sales", response_model=List[schemas.Sale])
def read_sales(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> List[schemas.Sale]:
    return crud.list_sales(db, skip=skip, limit=limit)


@app.get("/sales/{sale_id}", response_model=schemas.Sale)
def read_sale(sale_id: int, db: Session = Depends(get_db)) -> schemas.Sale:
    db_sale = crud.get_sale(db, sale_id)
    if not db_sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    return db_sale


@app.put("/sales/{sale_id}", response_model=schemas.Sale)
def update_sale(
    sale_id: int,
    sale_update: schemas.SaleUpdate,
    db: Session = Depends(get_db),
) -> schemas.Sale:
    db_sale = crud.get_sale(db, sale_id)
    if not db_sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    try:
        return crud.update_sale(db, db_sale, sale_update)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@app.post("/sales/{sale_id}/cancel", response_model=schemas.Sale)
def cancel_sale(sale_id: int, db: Session = Depends(get_db)) -> schemas.Sale:
    db_sale = crud.get_sale(db, sale_id)
    if not db_sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    if db_sale.status.value == schemas.SaleStatus.CANCELLED.value:
        return db_sale
    return crud.cancel_sale(db, db_sale)


# Financeiro
@app.post("/financial-entries", response_model=schemas.FinancialEntry, status_code=status.HTTP_201_CREATED)
def create_financial_entry(entry: schemas.FinancialEntryCreate, db: Session = Depends(get_db)) -> schemas.FinancialEntry:
    return crud.create_financial_entry(db, entry)


@app.post("/cashboxes", status_code=status.HTTP_201_CREATED)
def create_cashbox(payload: dict, db: Session = Depends(get_db)):
    name = payload.get('name')
    initial = payload.get('initial_amount', 0)
    try:
        cb = crud.create_cashbox(db, name=name, initial_amount=float(initial))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"id": cb.id, "name": cb.name, "initial_amount": float(cb.initial_amount), "created_at": cb.created_at.isoformat()}


@app.get("/cashboxes")
def list_cashboxes(db: Session = Depends(get_db)):
    cbs = crud.list_cashboxes(db)
    return [{"id": c.id, "name": c.name, "initial_amount": float(c.initial_amount), "opened_at": c.opened_at.isoformat() if c.opened_at else None, "closed_at": c.closed_at.isoformat() if c.closed_at else None, "closed_amount": float(c.closed_amount) if c.closed_amount is not None else None} for c in cbs]


@app.post("/cashboxes/{cashbox_id}/open")
def open_cashbox(cashbox_id: int, db: Session = Depends(get_db)):
    try:
        cb = crud.open_cashbox(db, cashbox_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"id": cb.id, "opened_at": cb.opened_at.isoformat() if cb.opened_at else None}


@app.post("/cashboxes/{cashbox_id}/close")
def close_cashbox(cashbox_id: int, payload: dict, db: Session = Depends(get_db)):
    amount = payload.get('closed_amount')
    try:
        cb = crud.close_cashbox(db, cashbox_id, closed_amount=float(amount))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"id": cb.id, "closed_at": cb.closed_at.isoformat() if cb.closed_at else None, "closed_amount": float(cb.closed_amount) if cb.closed_amount is not None else None}


@app.get("/cashboxes/{cashbox_id}/report")
def cashbox_report(cashbox_id: int, db: Session = Depends(get_db)):
    try:
        rpt = crud.cashbox_report(db, cashbox_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return rpt


@app.get("/financial-entries", response_model=List[schemas.FinancialEntry])
def read_financial_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    type: str | None = Query(None),
    db: Session = Depends(get_db),
) -> List[schemas.FinancialEntry]:
    return crud.list_financial_entries(db, skip=skip, limit=limit, type=type)


@app.get("/financial-entries/{entry_id}", response_model=schemas.FinancialEntry)
def read_financial_entry(entry_id: int, db: Session = Depends(get_db)) -> schemas.FinancialEntry:
    db_entry = crud.get_financial_entry(db, entry_id)
    if not db_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return db_entry


@app.put("/financial-entries/{entry_id}", response_model=schemas.FinancialEntry)
def update_financial_entry(entry_id: int, entry_update: schemas.FinancialEntryUpdate, db: Session = Depends(get_db)) -> schemas.FinancialEntry:
    db_entry = crud.get_financial_entry(db, entry_id)
    if not db_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return crud.update_financial_entry(db, db_entry, entry_update)


@app.delete("/financial-entries/{entry_id}", status_code=status.HTTP_200_OK)
def delete_financial_entry(entry_id: int, db: Session = Depends(get_db)) -> None:
    db_entry = crud.get_financial_entry(db, entry_id)
    if not db_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    crud.delete_financial_entry(db, db_entry)
    return {"status": "ok"}


# Categories endpoints
@app.get("/categories", response_model=List[schemas.Category])
def read_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> List[schemas.Category]:
    return crud.list_categories(db, skip=skip, limit=limit)


@app.post("/categories", response_model=schemas.Category, status_code=status.HTTP_201_CREATED)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)) -> schemas.Category:
    return crud.create_category(db, category)











