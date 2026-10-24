$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$migration = Get-Content -Raw -Encoding utf8 -LiteralPath "$workspace/supabase/migrations/202610250001_admin_experiences.sql"
$checks = Get-Content -Raw -Encoding utf8 -LiteralPath "$workspace/supabase/tests/database/002_experiences.test.sql"
# Apply the migration only within this test transaction, rolled back by the test.
$sql = 'begin;' + [Environment]::NewLine + $migration + [Environment]::NewLine + $checks.Replace('begin;', '')
$result = $sql | rtk proxy docker exec -i supabase_db_hanoi-craft-trust psql -U postgres -d postgres -v ON_ERROR_STOP=1
$code = $LASTEXITCODE
$result
if ($code -ne 0 -or ($result -match 'not ok|Looks like you')) { exit 1 }
