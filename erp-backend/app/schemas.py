from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_serializer


class ProductBase(BaseModel):
    name: str = Field(..., max_length=255)
    sku: str = Field(..., max_length=100)
    category: str = Field(..., max_length=100)
    supplier: Optional[str] = Field(None, max_length=255)
    cost_price: Decimal = Field(..., ge=0)
    sale_price: Decimal = Field(..., ge=0)
    stock: int = Field(0, ge=0)
    min_stock: int = Field(0, ge=0)
    # margin can be negative (sale_price < cost_price) so don't enforce ge=0
    margin: Decimal = Field(0)
    photos: List[str] = Field(default_factory=list)
    extra_attributes: Dict[str, List[str]] = Field(default_factory=dict)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    sku: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    supplier: Optional[str] = Field(None, max_length=255)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    sale_price: Optional[Decimal] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)
    min_stock: Optional[int] = Field(None, ge=0)
    photos: Optional[List[str]] = None
    extra_attributes: Optional[Dict[str, List[str]]] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    sub: int | None = None
    tenant_id: int | None = None


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    tenant_id: Optional[int] = None


class TenantCreate(BaseModel):
    name: str
    slug: str


class Tenant(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class User(BaseModel):
    id: int
    tenant_id: int
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_sold: float = 0.0

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("cost_price", "sale_price", mode="plain")
    def serialize_decimal(self, value: Decimal) -> float:
        return float(value)

    @field_serializer("total_sold", mode="plain")
    def serialize_total_sold(self, value: float) -> float:
        return float(value)

    @field_serializer("margin", mode="plain")
    def serialize_margin(self, value: Decimal) -> float:
        return float(value)


class CustomerBase(BaseModel):
    name: str = Field(..., max_length=255)
    # ...campo 'document' removido...
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=500)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    # ...campo 'document' removido...
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=500)


class Customer(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    # current outstanding balance (derived)
    balance_due: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class SaleStatus(str, Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    DINHEIRO = "dinheiro"
    CARTAO = "cartao"
    PIX = "pix"
    FIADO = "fiado"


class SaleItemBase(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)


class SaleItemCreate(SaleItemBase):
    pass


class SaleItem(SaleItemBase):
    id: int
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("unit_price", "line_total", mode="plain")
    def serialize_amount(self, value: Decimal) -> float:
        return float(value)


class SalePaymentBase(BaseModel):
    method: PaymentMethod
    amount: Decimal = Field(..., ge=0)
    notes: Optional[str] = Field(None, max_length=255)


class SalePaymentCreate(SalePaymentBase):
    pass


class SalePayment(SalePaymentBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("amount", mode="plain")
    def serialize_amount(self, value: Decimal) -> float:
        return float(value)


class SaleBase(BaseModel):
    customer_id: Optional[int] = Field(None, gt=0)
    items: List[SaleItemCreate] = Field(..., min_length=1)
    payments: List[SalePaymentCreate] = Field(..., min_items=1)
    notes: Optional[str] = Field(None, max_length=500)


class SaleCreate(SaleBase):
    pass


class SaleUpdate(BaseModel):
    customer_id: Optional[int] = Field(None, gt=0)
    status: Optional[SaleStatus] = None
    items: Optional[List[SaleItemCreate]] = Field(None, min_length=1)
    payments: Optional[List[SalePaymentCreate]] = Field(None, min_items=1)
    notes: Optional[str] = Field(None, max_length=500)


class Sale(SaleBase):
    id: int
    status: SaleStatus
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    customer: Optional[Customer] = None
    items: List[SaleItem]
    payments: List[SalePayment]
    # pending fiado after customer payments allocations (amount still owed for this sale)
    total_fiado_pending: float = 0.0

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("total_amount", mode="plain")
    def serialize_total(self, value: Decimal) -> float:
        return float(value)

    @computed_field
    @property
    def total_paid(self) -> float:
        return float(sum(payment.amount for payment in self.payments))

    @computed_field
    @property
    def balance_due(self) -> float:
        total = Decimal(self.total_amount)
        paid = sum(payment.amount for payment in self.payments)
        return float(total - paid)

    @computed_field
    @property
    def total_fiado(self) -> float:
        return float(
            sum(payment.amount for payment in self.payments if payment.method == PaymentMethod.FIADO)
        )



class EntryType(str, Enum):
    RECEITA = "receita"
    DESPESA = "despesa"


class FinancialEntryBase(BaseModel):
    date: Optional[datetime] = None
    type: EntryType
    category: str = Field(..., max_length=100)
    amount: Decimal = Field(..., ge=0)
    notes: Optional[str] = Field(None, max_length=500)
    cashbox_id: Optional[int] = None


class FinancialEntryCreate(FinancialEntryBase):
    pass


class FinancialEntryUpdate(BaseModel):
    date: Optional[datetime] = None
    type: Optional[EntryType] = None
    category: Optional[str] = Field(None, max_length=100)
    amount: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=500)


class FinancialEntry(FinancialEntryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    # include cashbox id in serialized output
    cashbox_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("amount", mode="plain")
    def serialize_amount(self, value: Decimal) -> float:
        return float(value)


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class CategoryCreate(CategoryBase):
    pass


class Category(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductsReportTotals(BaseModel):
    total_products: int
    total_cost: float
    total_sale: float


class ProductsReport(BaseModel):
    products: List[Product]
    totals: ProductsReportTotals


