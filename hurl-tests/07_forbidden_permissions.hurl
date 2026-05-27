# Forbidden permissions

POST {{base_url}}/user
x-api-key: {{api_key}}
Content-Type: application/json
{
  "name": "Hurl Forbidden User {{run_id}}",
  "email": "hurl-forbidden-user-{{run_id}}@example.com",
  "password": "Test123!"
}
HTTP 201
[Captures]
forbidden_user_id: jsonpath "$.id"

POST {{base_url}}/auth/login
Content-Type: application/json
{
  "email": "hurl-forbidden-user-{{run_id}}@example.com",
  "password": "Test123!"
}
HTTP 200
[Captures]
forbidden_user_token: jsonpath "$.token"

POST {{base_url}}/repos
x-api-key: {{api_key}}
Content-Type: application/json
{
  "url": "{{public_repo_url}}",
  "name": "hurl-forbidden-{{run_id}}",
  "depth": 1,
  "branch": "{{default_branch}}"
}
HTTP 202

GET {{base_url}}/repos/hurl-forbidden-{{run_id}}/analysis
x-api-key: {{api_key}}
[Options]
retry: 90
retry-interval: 1000
HTTP 200

GET {{base_url}}/repos/hurl-forbidden-{{run_id}}/analysis
Authorization: Bearer {{forbidden_user_token}}
HTTP 404
[Asserts]
jsonpath "$.error" exists

PATCH {{base_url}}/user/@me
x-api-key: {{api_key}}
Content-Type: application/json
{
  "name": "Should Not Work"
}
HTTP 403
[Asserts]
jsonpath "$.error" exists

POST {{base_url}}/auth/logout
Authorization: Bearer {{forbidden_user_token}}
HTTP 204

DELETE {{base_url}}/user/{{forbidden_user_id}}
x-api-key: {{api_key}}
HTTP 204

