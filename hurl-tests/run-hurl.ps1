$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$VarsFile = Join-Path $ScriptDir ".env"
if (-not (Test-Path $VarsFile)) {
  $VarsFile = Join-Path $ScriptDir "variables.example.env"
}

$RunRoot = Get-Date -Format "yyyyMMddHHmmss"

Write-Host "Dockix Hurl tests - contract-oriented suite"
Write-Host "Variables file: $VarsFile"
Write-Host "Run root:       $RunRoot"
Write-Host ""

hurl --version
Write-Host ""

$activeFiles = @(
  "01_auth_user.hurl",
  "02_prefetch.hurl",
  "03_public_repo_flow.hurl",
  "04_roles_members_flow.hurl",
  "05_negative_cases.hurl",
  "06_admin_events.hurl",
  "07_forbidden_permissions.hurl"
)

$failed = $false
$runIds = @{}

foreach ($file in $activeFiles) {
  $slug = [System.IO.Path]::GetFileNameWithoutExtension($file) -replace "^[0-9]+_", ""
  $fileRunId = "${RunRoot}_${slug}"
  $runIds[$file] = $fileRunId

  Write-Host ">>> Running $file"
  Write-Host "    run_id=$fileRunId"

  hurl --test `
    --variables-file "$VarsFile" `
    --variable "run_id=$fileRunId" `
    $file

  if ($LASTEXITCODE -ne 0) {
    $failed = $true
  }

  Write-Host ""
}

function Get-EnvValue {
  param([string]$Name, [string]$DefaultValue)
  $line = Get-Content $VarsFile | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
  if ($line) { return (($line -split "=", 2)[1]).Trim() }
  return $DefaultValue
}

$BaseUrl = Get-EnvValue "base_url" "http://127.0.0.1:3000"
$ApiKey = Get-EnvValue "api_key" "test123"

function Remove-RepoWithRetry {
  param([string]$RepoName, [int]$Retries = 180, [int]$SleepSeconds = 1)

  Write-Host ">>> Deferred cleanup repo: $RepoName"

  for ($i = 1; $i -le $Retries; $i++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Method DELETE -Uri "$BaseUrl/repos/$RepoName" -Headers @{ "x-api-key" = $ApiKey } -ErrorAction Stop
      if ($response.StatusCode -eq 204) {
        Write-Host "Cleanup OK: $RepoName deleted"
        return $true
      }
    }
    catch {
      $statusCode = $null
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { $statusCode = [int]$_.Exception.Response.StatusCode }
      if ($statusCode -eq 404) {
        Write-Host "Cleanup OK: $RepoName already absent"
        return $true
      }
      if ($statusCode -eq 409) {
        Start-Sleep -Seconds $SleepSeconds
        continue
      }
      Write-Host "Cleanup attempt $i failed for $RepoName with status $statusCode"
      Start-Sleep -Seconds $SleepSeconds
    }
  }

  Write-Host "Cleanup FAILED: $RepoName was not deleted after retry window"
  return $false
}

Write-Host ">>> Deferred cleanup"
$cleanupFailed = $false

foreach ($rid in $runIds.Values) {
  foreach ($prefix in @("hurl-public", "hurl-roles", "hurl-events", "hurl-forbidden")) {
    if (-not (Remove-RepoWithRetry "$prefix-$rid")) { $cleanupFailed = $true }
  }
}

Write-Host ""
Write-Host "Done. Disabled/manual files:"
Write-Host "- 98_schema_mismatch_current_behavior.hurl.disabled"
Write-Host "- 99_private_repo_template.hurl.disabled"
Write-Host "- 99_cleanup.hurl can be used for manual cleanup with a known run_id."

if ($failed -or $cleanupFailed) { exit 1 }
exit 0
