# Prefetch endpoint

POST {{base_url}}/repos/prefetch
x-api-key: {{api_key}}
Content-Type: application/json
{
  "url": "{{public_repo_url}}"
}
HTTP 200
[Asserts]
jsonpath "$.default_branch" exists
jsonpath "$.branches" exists
jsonpath "$.tags" exists
body contains "{{default_branch}}"

POST {{base_url}}/repos/prefetch
x-api-key: {{api_key}}
Content-Type: application/json
{
  "url": "not-a-valid-url"
}
HTTP 400
[Asserts]
jsonpath "$.error" contains "Invalid URL format"

POST {{base_url}}/repos/prefetch
x-api-key: {{api_key}}
Content-Type: application/json
{
  "url": ""
}
HTTP 400
[Asserts]
jsonpath "$.error" exists
