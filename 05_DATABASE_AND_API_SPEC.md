# PromptShield — Database & API Specification

## 1. MongoDB Collections

### users

```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string",
  "role": "admin|analyst|user",
  "status": "active|disabled",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### security_events

```json
{
  "_id": "ObjectId",
  "requestId": "uuid",
  "userId": "ObjectId",
  "sessionId": "string",
  "timestamp": "date",
  "decision": "ALLOW|WARN|SANITIZE|BLOCK",
  "riskScore": 0,
  "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
  "categories": [],
  "signals": [],
  "provider": "ollama|openai",
  "model": "string",
  "latencyMs": 0,
  "sanitized": false
}
```

### policies

```json
{
  "_id": "ObjectId",
  "name": "string",
  "enabled": true,
  "thresholds": {},
  "rules": {},
  "createdBy": "ObjectId",
  "updatedAt": "date"
}
```

### audit_logs

```json
{
  "_id": "ObjectId",
  "actorId": "ObjectId",
  "action": "string",
  "resource": "string",
  "timestamp": "date",
  "metadata": {}
}
```

## 2. API Structure

Base URL:

`/api/v1`

### Health

`GET /health`

### Authentication

`POST /auth/login`
`POST /auth/logout`
`GET /auth/me`

### Prompt Security

`POST /analyze`
`POST /sanitize`
`POST /execute`

### Events

`GET /events`
`GET /events/:id`

### Dashboard

`GET /dashboard/summary`
`GET /dashboard/trends`
`GET /dashboard/categories`

### Admin

`GET /admin/users`
`PATCH /admin/users/:id/role`
`GET /admin/policies`
`PATCH /admin/policies/:id`
`GET /admin/audit-logs`

## 3. Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid prompt request",
    "requestId": "uuid"
  }
}
```

Never return stack traces in production responses.

## 4. Analyze Response Example

```json
{
  "requestId": "req_123",
  "decision": "BLOCK",
  "riskScore": 91,
  "riskLevel": "CRITICAL",
  "categories": [
    "DIRECT_INJECTION",
    "PROMPT_LEAK"
  ],
  "signals": [
    {
      "source": "RULE",
      "id": "PI-001",
      "severity": "HIGH"
    }
  ],
  "sanitizedPrompt": null,
  "llmResponse": null,
  "latencyMs": 82
}
```

## 5. Authorization

Example permissions:

| Action | Admin | Analyst | User |
|---|---:|---:|---:|
| Analyze prompt | Yes | Yes | Yes |
| View own events | Yes | Yes | Yes |
| View all events | Yes | Yes | No |
| Change policies | Yes | No | No |
| Manage users | Yes | No | No |
| View audit logs | Yes | Yes | No |
| Change roles | Yes | No | No |
