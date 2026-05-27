#!/usr/bin/env bash
set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

VARS_FILE="$SCRIPT_DIR/.env"
if [ ! -f "$VARS_FILE" ]; then
  VARS_FILE="$SCRIPT_DIR/variables.example.env"
fi

RUN_ROOT="$(date +%Y%m%d%H%M%S)"

echo "Dockix Hurl tests - contract-oriented suite"
echo "Variables file: $VARS_FILE"
echo "Run root:       $RUN_ROOT"
echo ""

hurl --version
echo ""

ACTIVE_FILES=("01_auth_user.hurl" "02_prefetch.hurl" "03_public_repo_flow.hurl" "04_roles_members_flow.hurl" "05_negative_cases.hurl" "06_admin_events.hurl" "07_forbidden_permissions.hurl")

FAILED=0
RUN_IDS=()

for file in "${ACTIVE_FILES[@]}"; do
  slug="${file%.hurl}"
  slug="${slug#[0-9][0-9]_}"
  run_id="${RUN_ROOT}_${slug}"
  RUN_IDS+=("$run_id")

  echo ">>> Running $file"
  echo "    run_id=$run_id"

  hurl --test --variables-file "$VARS_FILE" --variable "run_id=$run_id" "$file"
  if [ $? -ne 0 ]; then FAILED=1; fi
  echo ""
done

get_env_value() {
  local name="$1"; local default_value="$2"
  local value
  value="$(grep -E "^[[:space:]]*$name[[:space:]]*=" "$VARS_FILE" | head -n1 | cut -d= -f2- | xargs)"
  if [ -z "$value" ]; then echo "$default_value"; else echo "$value"; fi
}

BASE_URL="$(get_env_value base_url "http://127.0.0.1:3000")"
API_KEY="$(get_env_value api_key "test123")"

remove_repo_with_retry() {
  local repo_name="$1"; local retries="${2:-180}"; local sleep_seconds="${3:-1}"
  echo ">>> Deferred cleanup repo: $repo_name"
  for ((i=1; i<=retries; i++)); do
    status="$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/repos/$repo_name" -H "x-api-key: $API_KEY")"
    if [ "$status" = "204" ] || [ "$status" = "404" ]; then
      echo "Cleanup OK: $repo_name status=$status"
      return 0
    fi
    if [ "$status" = "409" ]; then sleep "$sleep_seconds"; continue; fi
    echo "Cleanup attempt $i failed for $repo_name with status $status"
    sleep "$sleep_seconds"
  done
  echo "Cleanup FAILED: $repo_name was not deleted after retry window"
  return 1
}

echo ">>> Deferred cleanup"
CLEANUP_FAILED=0
for rid in "${RUN_IDS[@]}"; do
  for prefix in hurl-public hurl-roles hurl-events hurl-forbidden; do
    remove_repo_with_retry "$prefix-$rid" || CLEANUP_FAILED=1
  done
done

echo ""
echo "Done. Disabled/manual files:"
echo "- 98_schema_mismatch_current_behavior.hurl.disabled"
echo "- 99_private_repo_template.hurl.disabled"
echo "- 99_cleanup.hurl can be used for manual cleanup with a known run_id."

if [ "$FAILED" -ne 0 ] || [ "$CLEANUP_FAILED" -ne 0 ]; then exit 1; fi
exit 0
