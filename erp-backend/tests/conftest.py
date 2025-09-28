import os
import sys
from pathlib import Path

# Ensure erp-backend is on sys.path when pytest runs from the repository root
HERE = Path(__file__).resolve().parent
PROJ_ROOT = HERE.parent
sys.path.insert(0, str(PROJ_ROOT))

# Provide minimal env defaults for tests that import app at collection time
os.environ.setdefault('DATABASE_URL', 'sqlite:///./.tmp_test.db')
os.environ.setdefault('SECRET_KEY', 'test-secret')
os.environ.setdefault('ACCESS_TOKEN_EXPIRE_MINUTES', '60')
