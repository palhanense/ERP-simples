try {
    $b = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/docs' -TimeoutSec 5
    Write-Output "BACKEND_OK"
} catch {
    Write-Output "BACKEND_FAIL: $($_.Exception.Message)"
}

try {
    $f = Invoke-RestMethod -Uri 'http://localhost:5173' -TimeoutSec 5
    Write-Output "FRONTEND_OK"
} catch {
    Write-Output "FRONTEND_FAIL: $($_.Exception.Message)"
}
