try {
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/financial-entries' -TimeoutSec 10
    if ($r -is [System.Array]) {
        Write-Output ("Count: " + $r.Length)
        if ($r.Length -gt 0) { Write-Output "First item:"; $r[0] | ConvertTo-Json -Depth 5 }
    } else {
        Write-Output "Response is not an array:"; $r | ConvertTo-Json -Depth 5
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
