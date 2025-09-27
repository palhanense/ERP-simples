import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging. Some environments may not have
# all expected logger sections in alembic.ini; guard to avoid KeyError during
# automated runs inside containers.
if config.config_file_name is not None:
    try:
        fileConfig(config.config_file_name)
    except Exception:
        # Logging config is optional for our purpose; continue without it.
        pass

# Import the project's metadata
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.database import Base  # type: ignore
# ensure models are imported so metadata is populated
try:
    from app import models  # noqa: F401
except Exception:
    # If import fails, autogenerate won't work; allow alembic command to surface the error later
    pass

target_metadata = Base.metadata


def get_url():
    return os.environ.get('DATABASE_URL', config.get_main_option('sqlalchemy.url'))


def run_migrations_offline():
    url = get_url()
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    configuration = config.get_section(config.config_ini_section)
    configuration['sqlalchemy.url'] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
