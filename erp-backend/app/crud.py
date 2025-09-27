from __future__ import annotations

from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func

from app.services.image_processing import remove_product_photos

from app import models, schemas


# Produtos

def append_product_photos(
    db: Session, db_product: models.Product, photo_paths: List[str]
) -> models.Product:
    existing = list(db_product.photos or [])
    existing.extend(photo_paths)
    db_product.photos = existing
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def remove_product_photo(db: Session, db_product: models.Product, public_path: str) -> models.Product:
    """Remove a single photo path from product.photos and delete the file from disk."""
    if not public_path:
        return db_product

    existing = list(db_product.photos or [])
    if public_path in existing:
        existing = [p for p in existing if p != public_path]
        db_product.photos = existing
        # remove file from storage
        remove_product_photos([public_path])
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
    return db_product


def create_product(db: Session, product_in: schemas.ProductCreate) -> models.Product:
    data = product_in.model_dump()
    # compute margin = sale_price - cost_price
    try:
        data['margin'] = float(data.get('sale_price', 0) or 0) - float(data.get('cost_price', 0) or 0)
    except Exception:
        data['margin'] = 0
    db_product = models.Product(**data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def list_products(db: Session, skip: int = 0, limit: int = 100) -> List[models.Product]:
    return db.query(models.Product).offset(skip).limit(limit).all()


def list_products_report(
    db: Session,
    from_date: str | None = None,
    to_date: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> dict:
    """Return a report dict containing filtered products and aggregated totals.

    from_date and to_date should be ISO date strings (YYYY-MM-DD) or None.
    """
    q = db.query(models.Product)
    if from_date:
        q = q.filter(models.Product.created_at >= from_date)
    if to_date:
        q = q.filter(models.Product.created_at <= to_date)

    total_products = q.count()

    # fetch all matching products for totals (note: may be large in big DBs)
    all_products = q.order_by(models.Product.created_at.desc()).all()

    # helper to resolve stock similarly to frontend heuristics
    def _resolve_stock(product: models.Product) -> int:
        candidates = [
            getattr(product, "stock", None),
            getattr(product, "stock_quantity", None),
            getattr(product, "available_stock", None),
            getattr(product, "inventory", None),
        ]
        extra = getattr(product, "extra_attributes", None) or {}
        candidates.extend([extra.get("stock"), extra.get("estoque"), extra.get("available_stock")])
        for v in candidates:
            if v is None:
                continue
            try:
                n = int(v)
                return n
            except Exception:
                try:
                    n = int(float(v))
                    return n
                except Exception:
                    continue
        return 0

    from decimal import Decimal

    total_cost = Decimal("0")
    total_sale = Decimal("0")
    # compute total sold per product (sum of line_total from completed sales)
    sold_map: dict[int, Decimal] = {}
    for p in all_products:
        stock = _resolve_stock(p)
        total_cost += Decimal(p.cost_price or 0) * stock
        total_sale += Decimal(p.sale_price or 0) * stock

    # gather total sold values
    sale_items = (
        db.query(models.SaleItem.product_id, models.SaleItem.line_total)
        .join(models.Sale)
        .filter(models.Sale.status == models.SaleStatus.COMPLETED)
        .all()
    )
    for prod_id, line_total in sale_items:
        sold_map.setdefault(prod_id, Decimal("0"))
        sold_map[prod_id] += Decimal(line_total or 0)

    products_page = (
        q.order_by(models.Product.created_at.desc()).offset(skip).limit(limit).all()
    )

    # attach total_sold to each product in page
    products_out = []
    for prod in products_page:
        prod_total_sold = float(sold_map.get(prod.id, Decimal("0")))
        # create a lightweight dict copy with total_sold included for JSON serialization
        p_dict = {
            "id": prod.id,
            "name": prod.name,
            "sku": prod.sku,
            "category": prod.category,
            "supplier": getattr(prod, "supplier", None),
            "cost_price": float(prod.cost_price or 0),
            "sale_price": float(prod.sale_price or 0),
            "min_stock": prod.min_stock,
            "photos": prod.photos or [],
            "extra_attributes": prod.extra_attributes or {},
            "created_at": prod.created_at.isoformat(),
            "updated_at": prod.updated_at.isoformat(),
            "total_sold": prod_total_sold,
            "margin": float(getattr(prod, 'margin', 0) or 0),
        }
        products_out.append(p_dict)

    return {
        "products": products_out,
        "totals": {
            "total_products": total_products,
            "total_cost": float(total_cost),
            "total_sale": float(total_sale),
        },
    }


def get_product(db: Session, product_id: int) -> Optional[models.Product]:
    return db.query(models.Product).filter(models.Product.id == product_id).first()


def get_product_by_sku(db: Session, sku: str) -> Optional[models.Product]:
    return db.query(models.Product).filter(models.Product.sku == sku).first()


def update_product(
    db: Session, db_product: models.Product, product_in: schemas.ProductUpdate
) -> models.Product:
    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(db_product, field, value)
    # ensure margin is updated when prices change
    try:
        cost = float(getattr(db_product, 'cost_price', 0) or 0)
        sale = float(getattr(db_product, 'sale_price', 0) or 0)
        db_product.margin = sale - cost
    except Exception:
        db_product.margin = 0
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def delete_product(db: Session, db_product: models.Product) -> None:
    remove_product_photos(db_product.photos or [])
    db.delete(db_product)
    db.commit()


# Clientes

def create_customer(db: Session, customer_in: schemas.CustomerCreate) -> models.Customer:
    data = customer_in.model_dump()
    phone = data.get('phone')
    if phone:
        existing = db.query(models.Customer).filter(models.Customer.phone == phone).first()
        if existing:
            raise ValueError("Cliente já cadastrado.")

    db_customer = models.Customer(**data)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


def list_customers(db: Session, skip: int = 0, limit: int = 100) -> List[models.Customer]:
    return (
        db.query(models.Customer)
        .order_by(models.Customer.name.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_customer(db: Session, customer_id: int) -> Optional[models.Customer]:
    return db.get(models.Customer, customer_id)



def get_customer_by_phone(db: Session, phone: str) -> Optional[models.Customer]:
    if not phone:
        return None
    return db.query(models.Customer).filter(models.Customer.phone == phone).first()


def update_customer(
    db: Session, db_customer: models.Customer, customer_in: schemas.CustomerUpdate
) -> models.Customer:
    update_data = customer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_customer, field, value)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


def delete_customer(db: Session, db_customer: models.Customer) -> None:
    db.delete(db_customer)
    db.commit()


# Vendas

def create_sale(db: Session, sale_in: schemas.SaleCreate) -> models.Sale:
    sale = models.Sale(
        customer_id=sale_in.customer_id,
        notes=sale_in.notes,
        status=models.SaleStatus.COMPLETED,
    )
    db.add(sale)

    total_amount = Decimal("0")
    for item_in in sale_in.items:
        product = db.get(models.Product, item_in.product_id)
        if not product:
            raise ValueError(f"Produto {item_in.product_id} nao encontrado.")
        unit_price = (
            Decimal(item_in.unit_price)
            if item_in.unit_price is not None
            else Decimal(product.sale_price)
        )
        line_total = unit_price * item_in.quantity
        sale_item = models.SaleItem(
            product_id=product.id,
            quantity=item_in.quantity,
            unit_price=unit_price,
            line_total=line_total,
        )
        sale.items.append(sale_item)
        total_amount += line_total

    total_payments = _attach_payments(sale, sale_in.payments)
    _validate_payment_totals(total_amount, total_payments)
    sale.total_amount = total_amount

    db.commit()
    db.refresh(
        sale,
        attribute_names=["items", "payments", "customer"],
    )
    # Acessa relacionamentos para carregamento antes do fechamento da sessao
    _ensure_loaded(sale)
    return sale


def list_sales(db: Session, skip: int = 0, limit: int = 100) -> List[models.Sale]:
    sales = (
        db.query(models.Sale)
        .options(
            selectinload(models.Sale.items).selectinload(models.SaleItem.product),
            selectinload(models.Sale.payments),
            selectinload(models.Sale.customer),
        )
        .order_by(models.Sale.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return sales


def get_sale(db: Session, sale_id: int) -> Optional[models.Sale]:
    sale = (
        db.query(models.Sale)
        .options(
            selectinload(models.Sale.items).selectinload(models.SaleItem.product),
            selectinload(models.Sale.payments),
            selectinload(models.Sale.customer),
        )
        .filter(models.Sale.id == sale_id)
        .first()
    )
    return sale


def update_sale(
    db: Session, db_sale: models.Sale, sale_in: schemas.SaleUpdate
) -> models.Sale:
    if db_sale.status == models.SaleStatus.CANCELLED and sale_in.status not in (
        None,
        models.SaleStatus.CANCELLED,
        schemas.SaleStatus.CANCELLED,
    ):
        raise ValueError("Nao e possivel alterar uma venda cancelada.")

    if sale_in.customer_id is not None:
        if sale_in.customer_id:
            if not db.get(models.Customer, sale_in.customer_id):
                raise ValueError("Cliente informado nao existe.")
        db_sale.customer_id = sale_in.customer_id

    if sale_in.status is not None:
        db_sale.status = models.SaleStatus(sale_in.status.value)

    if sale_in.notes is not None:
        db_sale.notes = sale_in.notes

    if sale_in.items is not None:
        if db_sale.status == models.SaleStatus.CANCELLED:
            raise ValueError("Nao e possivel editar itens de venda cancelada.")
        db_sale.items.clear()
        total_amount = Decimal("0")
        for item_in in sale_in.items:
            product = db.get(models.Product, item_in.product_id)
            if not product:
                raise ValueError(f"Produto {item_in.product_id} nao encontrado.")
            unit_price = (
                Decimal(item_in.unit_price)
                if item_in.unit_price is not None
                else Decimal(product.sale_price)
            )
            line_total = unit_price * item_in.quantity
            db_sale.items.append(
                models.SaleItem(
                    product_id=product.id,
                    quantity=item_in.quantity,
                    unit_price=unit_price,
                    line_total=line_total,
                )
            )
            total_amount += line_total
        db_sale.total_amount = total_amount
    else:
        total_amount = Decimal(db_sale.total_amount)

    if sale_in.payments is not None:
        if db_sale.status == models.SaleStatus.CANCELLED:
            raise ValueError("Nao e possivel editar pagamentos de venda cancelada.")
        db_sale.payments.clear()
        total_payments = _attach_payments(db_sale, sale_in.payments)
    else:
        total_payments = sum(Decimal(payment.amount) for payment in db_sale.payments)

    _validate_payment_totals(Decimal(db_sale.total_amount), total_payments)

    db.add(db_sale)
    db.commit()
    db.refresh(
        db_sale,
        attribute_names=["items", "payments", "customer"],
    )
    _ensure_loaded(db_sale)
    return db_sale


def cancel_sale(db: Session, db_sale: models.Sale) -> models.Sale:
    db_sale.status = models.SaleStatus.CANCELLED
    db.add(db_sale)
    db.commit()
    db.refresh(
        db_sale,
        attribute_names=["items", "payments", "customer"],
    )
    _ensure_loaded(db_sale)
    return db_sale


def create_sale_payment(
    db: Session,
    sale_id: int,
    amount: float,
    method: str,
    notes: str | None = None,
) -> dict:
    """Register a payment for a sale (used for fiado settlements).

    Returns a dict: { 'payment': SalePayment, 'remaining_due': Decimal }
    """
    from decimal import Decimal

    sale = (
        db.query(models.Sale)
        .options(selectinload(models.Sale.payments))
        .filter(models.Sale.id == sale_id)
        .first()
    )
    if not sale:
        raise ValueError("Sale not found")

    # compute already paid
    total_paid = Decimal("0")
    for p in sale.payments or []:
        total_paid += Decimal(p.amount or 0)

    total_amount = Decimal(sale.total_amount or 0)
    remaining = total_amount - total_paid

    amt = Decimal(amount)
    if amt <= 0:
        raise ValueError("Amount must be greater than 0")
    if amt > remaining:
        # reject overpayment for now
        raise ValueError("Amount exceeds remaining due")

    # create payment
    payment = models.SalePayment(sale_id=sale.id, method=models.PaymentMethod(method), amount=amt, notes=notes)
    db.add(payment)
    # commit inside transaction
    db.commit()
    db.refresh(payment)

    remaining_due = float((total_amount - (total_paid + amt)))

    return {"payment": payment, "remaining_due": remaining_due}



def _attach_payments(
    sale: models.Sale, payment_inputs: List[schemas.SalePaymentCreate]
) -> Decimal:
    total_payments = Decimal("0")
    for payment_in in payment_inputs:
        method = models.PaymentMethod(payment_in.method.value)
        amount = Decimal(payment_in.amount)
        if amount <= 0:
            raise ValueError("Valor de pagamento deve ser maior que zero.")
        sale.payments.append(
            models.SalePayment(method=method, amount=amount, notes=payment_in.notes)
        )
        total_payments += amount
    return total_payments


def _validate_payment_totals(total_amount: Decimal, total_payments: Decimal) -> None:
    difference = abs(total_amount - total_payments)
    if difference > Decimal("0.01"):
        raise ValueError(
            "Total de pagamentos nao corresponde ao total da venda (considerando fiado)."
        )


def _ensure_loaded(sale: models.Sale) -> None:
    # Forca o carregamento de relacionamentos antes de fechar a sessao
    _ = sale.items
    _ = sale.payments
    _ = sale.customer


# Financeiro


def create_financial_entry(db: Session, entry_in: schemas.FinancialEntryCreate) -> models.FinancialEntry:
    data = entry_in.model_dump()
    # if date not provided, SQL default will set it
    db_entry = models.FinancialEntry(**data)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


def create_cashbox(db: Session, name: str, initial_amount: float = 0.0) -> models.Cashbox:
    from decimal import Decimal
    cb = models.Cashbox(name=name, initial_amount=Decimal(initial_amount))
    db.add(cb)
    db.commit()
    db.refresh(cb)
    return cb


def list_cashboxes(db: Session) -> List[models.Cashbox]:
    return db.query(models.Cashbox).order_by(models.Cashbox.created_at.desc()).all()


def get_cashbox(db: Session, cashbox_id: int) -> Optional[models.Cashbox]:
    return db.get(models.Cashbox, cashbox_id)


def open_cashbox(db: Session, cashbox_id: int) -> models.Cashbox:
    cb = get_cashbox(db, cashbox_id)
    if not cb:
        raise ValueError("Cashbox not found")
    # Prevent opening a cashbox that's already opened
    if cb.opened_at and not cb.closed_at:
        raise ValueError("Cashbox is already opened")
    cb.opened_at = func.now()
    db.add(cb)
    db.commit()
    db.refresh(cb)
    return cb


def close_cashbox(db: Session, cashbox_id: int, closed_amount: float) -> models.Cashbox:
    from decimal import Decimal
    cb = get_cashbox(db, cashbox_id)
    if not cb:
        raise ValueError("Cashbox not found")
    # Only allow closing if it was opened and not already closed
    if not cb.opened_at:
        raise ValueError("Cashbox is not opened")
    if cb.closed_at:
        raise ValueError("Cashbox is already closed")
    cb.closed_at = func.now()
    cb.closed_amount = Decimal(closed_amount)
    db.add(cb)
    db.commit()
    db.refresh(cb)
    return cb


def cashbox_report(db: Session, cashbox_id: int) -> dict:
    """Return a summary report for the given cashbox.

    - payments: list of { method, amount }
    - entries: list of financial entries (type, category, amount)
    - expected_cash: computed expected cash total (initial + receitas in cash - despesas in cash + reforcos - sangrias)
    """
    cb = get_cashbox(db, cashbox_id)
    if not cb:
        raise ValueError("Cashbox not found")

    # determine time window: from opened_at (if set) else created_at, until closed_at (if set) else now
    if cb.opened_at:
        start = cb.opened_at
    else:
        start = cb.created_at
    end = cb.closed_at

    # payments: gather sale payments created between start and end
    # Sales don't have a direct created_at per payment, but payments are linked to sales; we'll filter by sale.created_at
    from sqlalchemy import func

    q = db.query(models.SalePayment.method, func.coalesce(func.sum(models.SalePayment.amount), 0))
    q = q.join(models.Sale, models.Sale.id == models.SalePayment.sale_id)
    q = q.filter(models.Sale.created_at >= start)
    if end:
        q = q.filter(models.Sale.created_at <= end)
    q = q.group_by(models.SalePayment.method)
    payments = [{"method": row[0].value if hasattr(row[0], 'value') else str(row[0]), "amount": float(row[1] or 0)} for row in q.all()]

    # financial entries attached to this cashbox in the timeframe
    ent_q = db.query(models.FinancialEntry).filter(models.FinancialEntry.cashbox_id == cb.id)
    ent_q = ent_q.filter(models.FinancialEntry.created_at >= start)
    if end:
        ent_q = ent_q.filter(models.FinancialEntry.created_at <= end)
    entries = []
    for e in ent_q.order_by(models.FinancialEntry.created_at.asc()).all():
        entries.append({"type": e.type.value if hasattr(e.type, 'value') else str(e.type), "category": e.category, "amount": float(e.amount)})

    # compute expected cash: sum of payments in 'dinheiro' + financial_entries of type receita - despesas (only cash ones)
    cash_payments = next((p['amount'] for p in payments if p['method'] == models.PaymentMethod.DINHEIRO.value or p['method'] == models.PaymentMethod.DINHEIRO), 0)
    receitas = sum(e['amount'] for e in entries if e['type'] == 'receita')
    despesas = sum(e['amount'] for e in entries if e['type'] == 'despesa')
    expected_cash = float((float(cb.initial_amount or 0) + float(cash_payments or 0) + receitas - despesas))

    return {"payments": payments, "entries": entries, "expected_cash": expected_cash}


def create_customer_payment(db: Session, customer_id: int, amount: float, method: str, notes: str | None = None) -> dict:
    """Create a CustomerPayment and allocate the amount to the customer's outstanding fiado sales.

    Allocation order: most recent sale first (DESC by created_at). For each sale with balance_due > 0,
    deduct from the remaining amount and create a CustomerPaymentAllocation linking payment -> sale.

    Returns: { payment: CustomerPayment, allocations: List[{ sale_id, amount_allocated }], remaining: float }
    """
    from decimal import Decimal

    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise ValueError("Customer not found")

    payment = models.CustomerPayment(customer_id=customer.id, method=models.PaymentMethod(method), amount=Decimal(amount), notes=notes)
    db.add(payment)

    remaining = Decimal(amount)
    allocations = []

    # find outstanding sales for this customer, newest first
    outstanding_sales = (
        db.query(models.Sale)
        .filter(models.Sale.customer_id == customer.id)
        # allocate to oldest purchases first (FIFO)
        .order_by(models.Sale.created_at.asc())
        .all()
    )

    # compute total outstanding fiado across all sales for this customer
    total_outstanding = Decimal("0")
    for sale in outstanding_sales:
        # total fiado for this sale is sum of payments with method FIADO
        fiado_total = Decimal("0")
        for p in (sale.payments or []):
            try:
                pm = p.method
            except Exception:
                pm = None
            if pm == models.PaymentMethod.FIADO or str(pm) == str(models.PaymentMethod.FIADO):
                fiado_total += Decimal(p.amount or 0)

        # sum of previous allocations that already settled this sale
        allocated = db.query(func.coalesce(func.sum(models.CustomerPaymentAllocation.amount), 0)).filter(models.CustomerPaymentAllocation.sale_id == sale.id).scalar() or 0
        allocated = Decimal(allocated)

        sale_remaining = fiado_total - allocated
        if sale_remaining > 0:
            total_outstanding += sale_remaining

    if total_outstanding <= 0:
        # No fiado/open balance for this customer
        raise ValueError("Cliente não possui fiado em aberto.")

    for sale in outstanding_sales:
        # compute sale remaining as FIADO total minus previous allocations
        fiado_total = Decimal("0")
        for p in (sale.payments or []):
            try:
                pm = p.method
            except Exception:
                pm = None
            if pm == models.PaymentMethod.FIADO or str(pm) == str(models.PaymentMethod.FIADO):
                fiado_total += Decimal(p.amount or 0)

        allocated = db.query(func.coalesce(func.sum(models.CustomerPaymentAllocation.amount), 0)).filter(models.CustomerPaymentAllocation.sale_id == sale.id).scalar() or 0
        allocated = Decimal(allocated)
        sale_remaining = fiado_total - allocated
        if sale_remaining <= 0:
            continue

        if remaining <= 0:
            break

        allocate_amt = min(remaining, sale_remaining)
        alloc = models.CustomerPaymentAllocation(payment=payment, sale_id=sale.id, amount=allocate_amt)
        db.add(alloc)
        allocations.append({"sale_id": sale.id, "amount": float(allocate_amt)})
        remaining -= allocate_amt

    # commit and refresh
    db.commit()
    db.refresh(payment)

    return {"payment": payment, "allocations": allocations, "remaining": float(remaining)}


def list_financial_entries(db: Session, skip: int = 0, limit: int = 100, type: str | None = None) -> List[models.FinancialEntry]:
    q = db.query(models.FinancialEntry)
    if type:
        q = q.filter(models.FinancialEntry.type == type)
    return q.order_by(models.FinancialEntry.date.desc()).offset(skip).limit(limit).all()


def get_financial_entry(db: Session, entry_id: int) -> Optional[models.FinancialEntry]:
    return db.get(models.FinancialEntry, entry_id)


def update_financial_entry(db: Session, db_entry: models.FinancialEntry, entry_in: schemas.FinancialEntryUpdate) -> models.FinancialEntry:
    update_data = entry_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_entry, field, value)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


def delete_financial_entry(db: Session, db_entry: models.FinancialEntry) -> None:
    db.delete(db_entry)
    db.commit()


# Categories
def list_categories(db: Session, skip: int = 0, limit: int = 100) -> List[models.Category]:
    return db.query(models.Category).order_by(models.Category.name.asc()).offset(skip).limit(limit).all()


def create_category(db: Session, category_in: schemas.CategoryCreate) -> models.Category:
    name = category_in.name.strip()
    existing = db.query(models.Category).filter(models.Category.name == name).first()
    if existing:
        return existing
    db_cat = models.Category(name=name)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


