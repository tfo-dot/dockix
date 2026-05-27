# Manual cleanup helper for a known run_id.
# Run example:
# hurl --variables-file .env --variable run_id=20260527143000_public_repo_flow 99_cleanup.hurl
#
# Runner scripts already perform more tolerant deferred cleanup.

DELETE {{base_url}}/repos/hurl-public-{{run_id}}
x-api-key: {{api_key}}
[Options]
retry: 180
retry-interval: 1000
HTTP 204

DELETE {{base_url}}/repos/hurl-roles-{{run_id}}
x-api-key: {{api_key}}
[Options]
retry: 180
retry-interval: 1000
HTTP 204

DELETE {{base_url}}/repos/hurl-events-{{run_id}}
x-api-key: {{api_key}}
[Options]
retry: 180
retry-interval: 1000
HTTP 204

DELETE {{base_url}}/repos/hurl-forbidden-{{run_id}}
x-api-key: {{api_key}}
[Options]
retry: 180
retry-interval: 1000
HTTP 204
