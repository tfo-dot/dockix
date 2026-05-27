# Roles and members flow

POST {{base_url}}/user
x-api-key: {{api_key}}
Content-Type: application/json
{
  "name": "Hurl Member A {{run_id}}",
  "email": "hurl-member-a-{{run_id}}@example.com",
  "password": "Test123!"
}
HTTP 201
[Captures]
member_user_id: jsonpath "$.id"

POST {{base_url}}/user
x-api-key: {{api_key}}
Content-Type: application/json
{
  "name": "Hurl Member B {{run_id}}",
  "email": "hurl-member-b-{{run_id}}@example.com",
  "password": "Test123!"
}
HTTP 201
[Captures]
member_user_b_id: jsonpath "$.id"

POST {{base_url}}/repos
x-api-key: {{api_key}}
Content-Type: application/json
{
  "url": "{{public_repo_url}}",
  "name": "hurl-roles-{{run_id}}",
  "depth": 1,
  "branch": "{{default_branch}}"
}
HTTP 202
[Asserts]
jsonpath "$" == "Clone started, check GET /repos for status"

GET {{base_url}}/repos/hurl-roles-{{run_id}}/analysis
x-api-key: {{api_key}}
[Options]
retry: 90
retry-interval: 1000
HTTP 200

GET {{base_url}}/repos/hurl-roles-{{run_id}}/role
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body contains "admin"
body contains "viewer"

POST {{base_url}}/repos/hurl-roles-{{run_id}}/role
x-api-key: {{api_key}}
Content-Type: application/json
{
  "name": "Hurl Analyzer {{run_id}}",
  "permissions": ["analyze"],
  "level": 1
}
HTTP 201
[Captures]
role_id: jsonpath "$.id"
[Asserts]
jsonpath "$.permissions[0]" == "analyze"
jsonpath "$.level" == 1

PATCH {{base_url}}/repos/hurl-roles-{{run_id}}/role/{{role_id}}
x-api-key: {{api_key}}
Content-Type: application/json
{
  "name": "Hurl Analyzer Renamed {{run_id}}"
}
HTTP 200
[Asserts]
jsonpath "$.name" == "Hurl Analyzer Renamed {{run_id}}"
jsonpath "$.permissions[0]" == "analyze"
jsonpath "$.level" == 1

PATCH {{base_url}}/repos/hurl-roles-{{run_id}}/role/{{role_id}}
x-api-key: {{api_key}}
Content-Type: application/json
{
  "level": 2
}
HTTP 200
[Asserts]
jsonpath "$.name" == "Hurl Analyzer Renamed {{run_id}}"
jsonpath "$.permissions[0]" == "analyze"
jsonpath "$.level" == 2

PATCH {{base_url}}/repos/hurl-roles-{{run_id}}/role/{{role_id}}
x-api-key: {{api_key}}
Content-Type: application/json
{
  "permissions": ["analyze", "sync"]
}
HTTP 200
[Asserts]
jsonpath "$.name" == "Hurl Analyzer Renamed {{run_id}}"
jsonpath "$.level" == 2
body contains "sync"

POST {{base_url}}/repos/hurl-roles-{{run_id}}/member
x-api-key: {{api_key}}
Content-Type: application/json
{
  "user_id": "{{member_user_id}}",
  "role_id": "{{role_id}}"
}
HTTP 204

GET {{base_url}}/repos/hurl-roles-{{run_id}}/member
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body contains "{{member_user_id}}"
body contains "{{role_id}}"

DELETE {{base_url}}/repos/hurl-roles-{{run_id}}/role/{{role_id}}
x-api-key: {{api_key}}
HTTP 400
[Asserts]
jsonpath "$.error" exists

PATCH {{base_url}}/repos/hurl-roles-{{run_id}}/member/{{member_user_id}}
x-api-key: {{api_key}}
Content-Type: application/json
{
  "role_id": "viewer"
}
HTTP 204

GET {{base_url}}/repos/hurl-roles-{{run_id}}/member
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body contains "{{member_user_id}}"
body contains "viewer"

DELETE {{base_url}}/repos/hurl-roles-{{run_id}}/member/{{member_user_id}}
x-api-key: {{api_key}}
HTTP 204

GET {{base_url}}/repos/hurl-roles-{{run_id}}/member
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body == "[]"

POST {{base_url}}/repos/hurl-roles-{{run_id}}/member
x-api-key: {{api_key}}
Content-Type: application/json
{
  "user_id": "{{member_user_b_id}}"
}
HTTP 204

GET {{base_url}}/repos/hurl-roles-{{run_id}}/member
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body contains "{{member_user_b_id}}"

DELETE {{base_url}}/repos/hurl-roles-{{run_id}}/member/{{member_user_b_id}}
x-api-key: {{api_key}}
HTTP 204

DELETE {{base_url}}/repos/hurl-roles-{{run_id}}/role/{{role_id}}
x-api-key: {{api_key}}
HTTP 204

DELETE {{base_url}}/user/{{member_user_id}}
x-api-key: {{api_key}}
HTTP 204

DELETE {{base_url}}/user/{{member_user_b_id}}
x-api-key: {{api_key}}
HTTP 204
