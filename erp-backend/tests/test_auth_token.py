import sys
import os
# ensure erp-backend is on sys.path when tests run from repository root
HERE = os.path.dirname(os.path.abspath(__file__))
PROJ_ROOT = os.path.dirname(HERE)
sys.path.insert(0, PROJ_ROOT)
from app import auth

class DummyUser:
    pass


def test_create_and_decode_token():
    u = DummyUser()
    u.id = 42
    u.tenant_id = 9
    token = auth.create_token_for_user(u)
    assert isinstance(token, str) and token.count('.') == 2
    payload = auth.decode_access_token(token)
    assert payload.get('sub') == str(u.id)
    assert payload.get('tenant_id') == u.tenant_id
