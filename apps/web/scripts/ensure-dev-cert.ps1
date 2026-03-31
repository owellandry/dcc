param(
  [string]$OutputDir = (Join-Path $PSScriptRoot '..\certs'),
  [string]$Password = 'dcc-dev-https'
)

$ErrorActionPreference = 'Stop'

$resolvedOutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$pfxPath = Join-Path $resolvedOutputDir 'dev-local.pfx'
$cerPath = Join-Path $resolvedOutputDir 'dev-local.cer'

if ((Test-Path $pfxPath) -and (Test-Path $cerPath)) {
  Write-Host "Using existing development certificate at $pfxPath"
  exit 0
}

New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null

$localIpAddresses = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254*' -and
    $_.IPAddress -notlike '172.27.*'
  } |
  Select-Object -ExpandProperty IPAddress

$dnsNames = @('localhost', '127.0.0.1', [System.Net.Dns]::GetHostName(), $env:COMPUTERNAME) + $localIpAddresses
$dnsNames = $dnsNames | Where-Object { $_ } | Select-Object -Unique

Write-Host "Generating development certificate for: $($dnsNames -join ', ')"

$cert = New-SelfSignedCertificate `
  -FriendlyName 'dcc-web-dev' `
  -DnsName $dnsNames `
  -CertStoreLocation 'Cert:\CurrentUser\My' `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -NotAfter (Get-Date).AddYears(2)

$securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText

Export-PfxCertificate `
  -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" `
  -FilePath $pfxPath `
  -Password $securePassword | Out-Null

Export-Certificate `
  -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" `
  -FilePath $cerPath | Out-Null

Write-Host "Created certificate files:"
Write-Host "  PFX: $pfxPath"
Write-Host "  CER: $cerPath"
Write-Host 'Install the CER file as trusted on any other PC that will open the app over HTTPS.'
