"""Seed script to create an initial tenant and admin user for local dev.

Usage (from repo root):
    python .\scripts\seed_admin.py

It reads DATABASE_URL from env and uses app.database.SessionLocal to interact with DB.
"""
from app.database import SessionLocal
from app import crud
from app.auth import get_password_hash


def main():
    db = SessionLocal()
    try:
        tenant = crud.create_tenant(db, name="Default Tenant", slug="default")
        password = "admin123"  # change after first login
        pwd_hash = get_password_hash(password)
        admin = crud.create_user(db, email="admin@example.com", password_hash=pwd_hash, tenant_id=tenant.id, full_name="Admin", role=crud.models.UserRole.ADMIN)
        print("Created tenant:", tenant.id, tenant.name)
        print("Created admin user:", admin.id, admin.email)
        print("Default password:", password)
    except Exception as exc:
        print("Seed error:", exc)
    finally:
        db.close()


if __name__ == '__main__':
    main()
