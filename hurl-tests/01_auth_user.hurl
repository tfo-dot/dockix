# Auth and user flow

POST {{base_url}}/user
x-api-key: {{api_key}}
Content-Type: application/json
{
  "name": "Hurl QA User {{run_id}}",
  "email": "hurl-user-{{run_id}}@example.com",
  "password": "Test123!"
}
HTTP 201
[Captures]
user_id: jsonpath "$.id"
[Asserts]
jsonpath "$.id" exists
jsonpath "$.name" == "Hurl QA User {{run_id}}"
jsonpath "$.email" == "hurl-user-{{run_id}}@example.com"
jsonpath "$.created_at" matches "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}"

POST {{base_url}}/auth/login
Content-Type: application/json
{
  "email": "hurl-user-{{run_id}}@example.com",
  "password": "Test123!"
}
HTTP 200
[Captures]
user_token: jsonpath "$.token"
[Asserts]
jsonpath "$.token" exists

GET {{base_url}}/user/@me
Authorization: Bearer {{user_token}}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{user_id}}"
jsonpath "$.name" == "Hurl QA User {{run_id}}"
jsonpath "$.email" == "hurl-user-{{run_id}}@example.com"
jsonpath "$.created_at" matches "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}"

GET {{base_url}}/user/@me
x-api-key: {{api_key}}
HTTP 200
[Asserts]
jsonpath "$.role" == "superadmin"
body not contains "\"email\""
body not contains "\"name\""

GET {{base_url}}/user/list
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body contains "hurl-user-{{run_id}}@example.com"

PATCH {{base_url}}/user/@me
Authorization: Bearer {{user_token}}
Content-Type: application/json
{
  "name": "Hurl QA User Updated {{run_id}}"
}
HTTP 200
[Asserts]
jsonpath "$.name" == "Hurl QA User Updated {{run_id}}"
jsonpath "$.email" == "hurl-user-{{run_id}}@example.com"


POST {{base_url}}/auth/logout
Authorization: Bearer {{user_token}}
HTTP 204

GET {{base_url}}/user/@me
Authorization: Bearer {{user_token}}
HTTP 401
[Asserts]
jsonpath "$.error" contains "Invalid or expired token"

DELETE {{base_url}}/user/{{user_id}}
x-api-key: {{api_key}}
HTTP 204

GET {{base_url}}/user/list
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body not contains "hurl-user-{{run_id}}@example.com"

