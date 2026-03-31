$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$certScript = Join-Path $PSScriptRoot 'ensure-dev-cert.ps1'
$certDir = Join-Path $projectRoot 'certs'
$certFile = Join-Path $certDir 'dev-local.pfx'

& $certScript

$env:DEV_HTTPS = '1'
$env:DEV_HTTPS_CERT_FILE = $certFile
$env:DEV_HTTPS_CERT_PASSWORD = 'dcc-dev-https'
$env:DEV_API_PROXY_TARGET = if ($env:DEV_API_PROXY_TARGET) { $env:DEV_API_PROXY_TARGET } else { 'http://127.0.0.1:8080' }
$env:NEXT_PUBLIC_API_URL = 'https://localhost:3000'
$env:NEXT_PUBLIC_WS_URL = 'wss://localhost:3000'

Set-Location $projectRoot

Write-Host 'Starting Vinext dev server with HTTPS and local API proxy...'
Write-Host 'Proxy target:' $env:DEV_API_PROXY_TARGET

& bunx vinext dev --hostname 0.0.0.0 --port 3000
