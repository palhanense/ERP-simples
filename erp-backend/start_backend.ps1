Param()

# Start backend in a predictable way using the venv Python and uvicorn.
# This script intentionally does not pass --reload to avoid reloader-induced
# double-initialization of the SQLite DB.

Set-StrictMode -Version Latest
$here = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Push-Location $here

if (-Not (Test-Path -Path .\.venv)) {
    Write-Host "Criando venv..."
    python -m venv .venv
}

# Activate venv
& "${PWD}\.venv\Scripts\Activate.ps1"

# Ensure dependencies installed (no-op if already present)
pip install -r requirements.txt

# Run uvicorn without --reload to avoid multiple processes running init_db
Write-Host "Iniciando backend: uvicorn app.main:app --host 127.0.0.1 --port 8000"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Pop-Location
