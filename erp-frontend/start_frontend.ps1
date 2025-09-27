Param()

# Simple wrapper to install deps (if necessary) and start Vite dev server.
Set-StrictMode -Version Latest
$here = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Push-Location $here

if (-Not (Test-Path -Path "node_modules")) {
    Write-Host "Instalando dependências npm..."
    npm install
}

# Ensure VITE API URL file exists
if (-Not (Test-Path -Path ".env")) {
    Write-Host "Criando .env com URL padrão da API..."
    "VITE_API_URL=http://127.0.0.1:8000" | Out-File -Encoding UTF8 .env
}

Write-Host "Iniciando frontend (Vite)..."
# Start Vite in dev mode and bind to network interfaces so it's reachable
npm run dev -- --host
Pop-Location
