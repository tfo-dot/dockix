# Dockix Hurl tests

Automatyczne testy API dla backendu Dockix. Zestaw został przygotowany jako regression/contract-oriented suite pod aktualne endpointy backendu.

## Aktywne pliki

- `01_auth_user.hurl` — auth/user, `/user/@me` jako User i SuperadminInfo, `/user/list`, logout.
- `02_prefetch.hurl` — `/repos/prefetch`, ErrorResponse.
- `03_public_repo_flow.hurl` — public repo: POST, GET `/repos`, analysis, duplicate, DELETE.
- `04_roles_members_flow.hurl` — role/member flow, partial PATCH roli, próba usunięcia roli przypisanej do membera, member bez role_id.
- `05_negative_cases.hurl` — przypadki negatywne i ErrorResponse.
- `06_admin_events.hurl` — `/repos/{repo}/events`, `/admin/events`, 403 dla usera.
- `07_forbidden_permissions.hurl` — 403 dla analizy repo przez usera bez członkostwa i 403 dla PATCH `/user/@me` z x-api-key.
- `99_cleanup.hurl` — pomocniczy cleanup dla znanego `run_id`.

## Disabled/manual

- `98_schema_mismatch_current_behavior.hurl.disabled` — znane niespójności OpenAPI vs aktualna implementacja, np. generated_password i 422 przy brakujących polach.
- `99_private_repo_template.hurl.disabled` — private repo + token, bez commitowania sekretów.

## Konfiguracja

Nie wpisuj tokenów ani sekretów w terminalu. Nie przekazuj ich jako argumenty CLI, bo zostają w historii powłoki.

Windows:

```powershell
Copy-Item variables.example.env .env
```

Linux/macOS:

```bash
cp variables.example.env .env
```

Przykład `.env`:

```env
base_url=http://127.0.0.1:3000
api_key=test123
public_repo_url=https://github.com/tfo-dot/dockix.git
default_branch=uiui
```

`.env` jest ignorowany przez Git.

## Windows

Backend:

```powershell
cd C:\Users\zawad\dockix\backend
$env:DOCKIX_API_KEY="test123"
cargo run
```

Testy:

```powershell
cd C:\Users\zawad\dockix\hurl-tests
powershell -ExecutionPolicy Bypass -File .\run-hurl.ps1
```

## Linux/macOS/CI

```bash
cd hurl-tests
chmod +x run-hurl.sh
./run-hurl.sh
```

Skrypty używają `--variables-file .env` albo `variables.example.env`, jeśli `.env` nie istnieje.

## Izolacja stanu

Każdy aktywny plik dostaje osobny `run_id`, np. `20260527143000_auth_user`. Skrypty wykonują deferred cleanup repozytoriów, ponieważ backend może chwilowo zwracać `409 Conflict` dla DELETE po clone/analysis/role-member flow.
