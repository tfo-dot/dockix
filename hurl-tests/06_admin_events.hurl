# Events and admin events

POST {{base_url}}/user
x-api-key: {{api_key}}
Content-Type: application/json
{
  "name": "Hurl Events User {{run_id}}",
  "email": "hurl-events-user-{{run_id}}@example.com",
  "password": "Test123!"
}
HTTP 201
[Captures]
events_user_id: jsonpath "$.id"

POST {{base_url}}/auth/login
Content-Type: application/json
{
  "email": "hurl-events-user-{{run_id}}@example.com",
  "password": "Test123!"
}
HTTP 200
[Captures]
events_user_token: jsonpath "$.token"

POST {{base_url}}/repos
x-api-key: {{api_key}}
Content-Type: application/json
{
  "url": "{{public_repo_url}}",
  "name": "hurl-events-{{run_id}}",
  "depth": 1,
  "branch": "{{default_branch}}"
}
HTTP 202

GET {{base_url}}/repos/hurl-events-{{run_id}}/analysis
x-api-key: {{api_key}}
[Options]
retry: 90
retry-interval: 1000
HTTP 200

GET {{base_url}}/repos/hurl-events-{{run_id}}/events
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body startsWith "["

GET {{base_url}}/admin/events
x-api-key: {{api_key}}
HTTP 200
[Asserts]
body startsWith "["

GET {{base_url}}/admin/events
Authorization: Bearer {{events_user_token}}
HTTP 403
[Asserts]
jsonpath "$.error" exists

POST {{base_url}}/auth/logout
Authorization: Bearer {{events_user_token}}
HTTP 204

DELETE {{base_url}}/user/{{events_user_id}}
x-api-key: {{api_key}}
HTTP 204
