from importlib import import_module
import sys
sys.path.insert(0, 'erp-backend')
from app import auth
pw = 'testpass123'
print('SECRET_KEY:', auth.SECRET_KEY)
h = auth.get_password_hash(pw)
print('HASH:', h)
print('VERIFY:', auth.verify_password(pw, h))
