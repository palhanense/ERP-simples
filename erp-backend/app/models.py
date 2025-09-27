from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    supplier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cost_price: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    sale_price: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # margem financeira (preço de venda - preço de compra)
    margin: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    photos: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    extra_attributes: Mapped[Dict[str, List[str]]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    sale_items: Mapped[List["SaleItem"]] = relationship(back_populates="product")


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # ...campo 'document' removido...
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    sales: Mapped[List["Sale"]] = relationship(back_populates="customer")


class Cashbox(Base):
    __tablename__ = "cashboxes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    initial_amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    closed_amount: Mapped[Numeric | None] = mapped_column(Numeric(12, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # relationships
    entries: Mapped[List["FinancialEntry"]] = relationship(back_populates="cashbox")


class SaleStatus(str, Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    DINHEIRO = "dinheiro"
    CARTAO = "cartao"
    PIX = "pix"
    FIADO = "fiado"


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    status: Mapped[SaleStatus] = mapped_column(
        SqlEnum(SaleStatus, native_enum=False, values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
        default=SaleStatus.COMPLETED,
    )
    total_amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped[Customer | None] = relationship(back_populates="sales")
    items: Mapped[List["SaleItem"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan", passive_deletes=True
    )
    payments: Mapped[List["SalePayment"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan", passive_deletes=True
    )


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    line_total: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)

    sale: Mapped[Sale] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(back_populates="sale_items")


class SalePayment(Base):
    __tablename__ = "sale_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        SqlEnum(PaymentMethod, native_enum=False, values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
    )
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    sale: Mapped[Sale] = relationship(back_populates="payments")


class CustomerPayment(Base):
    __tablename__ = "customer_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        SqlEnum(PaymentMethod, native_enum=False, values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
    )
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    customer: Mapped[Customer] = relationship()
    allocations: Mapped[List["CustomerPaymentAllocation"]] = relationship(back_populates="payment", cascade="all, delete-orphan")


class CustomerPaymentAllocation(Base):
    __tablename__ = "customer_payment_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("customer_payments.id", ondelete="CASCADE"), nullable=False)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)

    payment: Mapped[CustomerPayment] = relationship(back_populates="allocations")
    # sale relationship optional (bidirectional already exists on Sale)
    sale: Mapped[Sale] = relationship()


class EntryType(str, Enum):
    RECEITA = "receita"
    DESPESA = "despesa"


class FinancialEntry(Base):
    __tablename__ = "financial_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    type: Mapped[EntryType] = mapped_column(
        SqlEnum(EntryType, native_enum=False, values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cashbox_id: Mapped[int | None] = mapped_column(ForeignKey("cashboxes.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    cashbox: Mapped[Cashbox | None] = relationship(back_populates="entries")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

