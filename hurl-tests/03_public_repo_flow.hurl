# Public repository clone and analysis flow

POST {{base_url}}/repos
x-api-key: {{api_key}}
Content-Type: application/json
{
  "url": "{{public_repo_url}}",
  "name": "hurl-public-{{run_id}}",
  "depth": 1,
  "branch": "{{default_branch}}"
}
HTTP 202
[Asserts]
jsonpath "$" == "Clone started, check GET /repos for status"

GET {{base_url}}/repos
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body contains "hurl-public-{{run_id}}"
body contains "\"status\""

GET {{base_url}}/repos/hurl-public-{{run_id}}/analysis
x-api-key: {{api_key}}
[Options]
retry: 90
retry-interval: 1000
HTTP 200
[Asserts]
jsonpath "$.repo_name" == "hurl-public-{{run_id}}"
jsonpath "$.files" exists

GET {{base_url}}/repos
x-api-key: {{api_key}}
[Options]
retry: 90
retry-interval: 1000
HTTP 200
[Asserts]
body contains "hurl-public-{{run_id}}"
body contains "\"status\":\"ready\""
body contains "\"last_synced_at\":\"20"

POST {{base_url}}/repos
x-api-key: {{api_key}}
Content-Type: application/json
{
  "url": "{{public_repo_url}}",
  "name": "hurl-public-{{run_id}}",
  "depth": 1
}
HTTP 409
[Asserts]
jsonpath "$.error" contains "Already exists"

DELETE {{base_url}}/repos/hurl-public-{{run_id}}
x-api-key: {{api_key}}
[Options]
retry: 90
retry-interval: 1000
HTTP 204

GET {{base_url}}/repos/hurl-public-{{run_id}}/analysis
x-api-key: {{api_key}}
HTTP 404
[Asserts]
jsonpath "$.error" exists
