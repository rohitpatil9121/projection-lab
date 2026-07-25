<#
.SYNOPSIS
  Builds the signed Play Store bundle (.aab).

.DESCRIPTION
  Prompts for the keystore password once and hands it to Gradle directly, instead of
  making you set four environment variables by hand. That manual route is easy to get
  wrong: PowerShell expands $ inside double quotes, so a password containing one is
  silently mangled and Gradle fails 60 seconds later with only "keystore password was
  incorrect" to explain it.

  The password is verified against the keystore BEFORE the build starts, so a wrong
  one fails in a second with a clear message rather than after a full compile.

  It is never written to disk, never echoed, and never enters shell history.

.EXAMPLE
  .\scripts\release-aab.ps1
  .\scripts\release-aab.ps1 -KeystorePath "C:\Users\rohit\keys\my-upload.jks"
#>
param(
  [string]$KeystorePath = "$env:USERPROFILE\keys\financial-blueprint-upload.jks",
  [string]$KeyAlias = 'upload'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $KeystorePath)) {
  Write-Host "Keystore not found: $KeystorePath" -ForegroundColor Red
  Write-Host "Create one first — see store-assets/PLAY-CHECKLIST.md section 1." -ForegroundColor Yellow
  exit 1
}

Write-Host "Keystore: $KeystorePath"
$secure = Read-Host -Prompt "Keystore password" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

if ([string]::IsNullOrWhiteSpace($plain)) { Write-Host "No password entered." -ForegroundColor Red; exit 1 }

# Fail fast: check the password now rather than after a full Gradle run.
Write-Host "Verifying password..." -NoNewline
$null = & keytool -list -keystore $KeystorePath -alias $KeyAlias -storepass $plain 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host " FAILED" -ForegroundColor Red
  Write-Host "That password does not open the keystore (or alias '$KeyAlias' is missing)." -ForegroundColor Red
  Write-Host "List the aliases with:  keytool -list -v -keystore `"$KeystorePath`"" -ForegroundColor Yellow
  exit 1
}
Write-Host " OK" -ForegroundColor Green

# Set in this process only — assigning here cannot be mangled by shell quoting,
# and the values disappear when the script exits.
$env:KEYSTORE_PATH = $KeystorePath
$env:KEYSTORE_PASSWORD = $plain
$env:KEY_ALIAS = $KeyAlias
$env:KEY_PASSWORD = $plain

Push-Location $repo
try {
  & npm run aab
  $code = $LASTEXITCODE
} finally {
  Pop-Location
  # Don't leave the password sitting in the session's environment.
  Remove-Item Env:KEYSTORE_PASSWORD, Env:KEY_PASSWORD -ErrorAction SilentlyContinue
  $plain = $null
}

exit $code
