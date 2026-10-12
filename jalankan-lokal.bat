@echo off
chcp 65001 >nul
title Menjalankan Editor Akademik Dimas Lokal

echo ===================================================
echo     Editor Akademik Dimas - Server Lokal
echo ===================================================
echo.
echo Mencari server lokal yang tersedia di komputer Anda...
echo.

:: 1. Coba Python
python -c "import http.server" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Menjalankan server lokal menggunakan Python di http://localhost:8000
    start "" http://localhost:8000
    python -m http.server 8000
    goto selesai
)

:: 2. Coba Py launcher
py -c "import http.server" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Menjalankan server lokal menggunakan Python di http://localhost:8000
    start "" http://localhost:8000
    py -m http.server 8000
    goto selesai
)

:: 3. Coba Node.js / npx serve
call npx --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Menjalankan server lokal menggunakan npx serve di http://localhost:8000
    start "" http://localhost:8000
    npx serve -l 8000 .
    goto selesai
)

:: 4. Fallback: PowerShell Simple Web Server
echo [Info] Menjalankan server mini bawaan Windows PowerShell di http://localhost:8000...
start "" http://localhost:8000
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port = 8000; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add(\"http://localhost:$port/\"); $listener.Start(); Write-Host \"Server aktif di http://localhost:$port/ (Tekan Ctrl+C untuk berhenti)\"; while ($listener.IsListening) { $context = $listener.GetContext(); $request = $context.Request; $response = $context.Response; $localPath = $request.Url.LocalPath.TrimStart('/'); if (-not $localPath) { $localPath = 'index.html' }; $filePath = Join-Path (Get-Location) $localPath; if (Test-Path $filePath -PathType Leaf) { $ext = [System.IO.Path]::GetExtension($filePath); $mime = switch ($ext) { '.html' {'text/html; charset=utf-8'} '.js' {'application/javascript; charset=utf-8'} '.css' {'text/css; charset=utf-8'} '.json' {'application/json; charset=utf-8'} '.png' {'image/png'} '.svg' {'image/svg+xml'} default {'application/octet-stream'} }; $response.ContentType = $mime; $bytes = [System.IO.File]::ReadAllBytes($filePath); $response.ContentLength64 = $bytes.Length; $response.OutputStream.Write($bytes, 0, $bytes.Length) } else { $response.StatusCode = 404 }; $response.Close() }"

:selesai
pause
