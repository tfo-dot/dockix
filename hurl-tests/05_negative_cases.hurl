# Negative cases and ErrorResponse shape

GET {{base_url}}/repos
HTTP 401
[Asserts]
jsonpath "$.error" exists

GET {{base_url}}/repos
x-api-key: wrong
HTTP 401
[Asserts]
jsonpath "$.error" exists

POST {{base_url}}/repos
x-api-key: {{api_key}}
Content-Type: application/json
{
  "url": "not-a-valid-url",
  "name": "hurl-invalid-{{run_id}}",
  "depth": 1
}
HTTP 400
[Asserts]
jsonpath "$.error" contains "Invalid URL format"

DELETE {{base_url}}/repos/hurl-missing-{{run_id}}
x-api-key: {{api_key}}
HTTP 404
[Asserts]
jsonpath "$.error" exists

GET {{base_url}}/repos/hurl-missing-{{run_id}}/analysis
x-api-key: {{api_key}}
HTTP 404
[Asserts]
jsonpath "$.error" exists

POST {{base_url}}/auth/login
Content-Type: application/json
{
  "email": "missing-{{run_id}}@example.com",
  "password": "wrong"
}
HTTP 401
[Asserts]
jsonpath "$.error" exists
