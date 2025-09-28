"""Seed script to create an initial tenant and admin user for local dev.

Usage (inside backend container or with PYTHONPATH pointing to erp-backend):
    python scripts/seed_admin.py

It reads DATABASE_URL from env and uses app.database.SessionLocal to interact with DB.
"""
from app.database import SessionLocal
from app import crud
from app.auth import get_password_hash


def run() -> None:
    db = SessionLocal()
    try:
        # create or get tenant
        existing_tenant = crud.get_tenant_by_slug(db, "default")
        if existing_tenant:
            tenant = existing_tenant
            print("Tenant already exists:", tenant.id, tenant.name)
        else:
            tenant = crud.create_tenant(db, name="Default Tenant", slug="default")
            print("Created tenant:", tenant.id, tenant.name)

        # create admin user if not exists
        existing_user = crud.get_user_by_email(db, "admin@example.com")
        if existing_user:
            print("Admin user already exists:", existing_user.id, existing_user.email)
        else:
            password = "admin123"  # change after first login
            pwd_hash = get_password_hash(password)
            admin = crud.create_user(db, email="admin@example.com", password_hash=pwd_hash, tenant_id=tenant.id, full_name="Admin", role=crud.models.UserRole.ADMIN)
            print("Created admin user:", admin.id, admin.email)
            print("Default password:", password)

    except Exception as exc:
        print("Seed error:", exc)
    finally:
        db.close()


if __name__ == '__main__':
    run()
