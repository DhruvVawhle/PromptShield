# PromptShield — Implementation Plan

## Phase 0 — Repository Foundation

Create:
- monorepo structure,
- frontend,
- backend,
- Python security engine,
- docs,
- Docker Compose,
- environment templates.

Deliverable:
A clean repository that starts all services.

## Phase 1 — Backend Foundation

Implement:
- Express app,
- configuration,
- MongoDB connection,
- request validation,
- error middleware,
- health endpoint,
- structured logging.

Deliverable:
`GET /api/v1/health`

## Phase 2 — Security Engine

Implement:
1. normalization,
2. rule engine,
3. attack taxonomy,
4. risk scoring,
5. detector interface,
6. initial ML detector,
7. sanitization,
8. guardrail policy.

Start with deterministic rules so the system is functional even before an ML model is trained.

## Phase 3 — API Integration

Connect Node backend to Python service.

Flow:
Frontend → Node → Python security engine → Node → decision

Add:
- timeout handling,
- service health,
- structured error handling.

## Phase 4 — LLM Integration

Implement provider adapter interface.

First:
- Ollama

Then:
- OpenAI

Ensure a blocked prompt never reaches the provider.

## Phase 5 — Database

Implement:
- users,
- security events,
- policies,
- audit logs.

Add indexes for:
- timestamp,
- userId,
- decision,
- riskScore,
- categories.

## Phase 6 — Authentication + RBAC

Implement:
- login/session mechanism,
- role checks,
- route guards,
- admin restrictions.

## Phase 7 — Frontend

Build in this order:

1. App shell
2. Dashboard
3. Prompt Playground
4. Incident list
5. Incident detail
6. Analytics
7. Policies
8. Users
9. Audit Logs
10. System/Providers

## Phase 8 — Evaluation Dataset

Create a documented dataset containing:
- benign prompts,
- direct injection prompts,
- jailbreak prompts,
- prompt leak prompts,
- role escalation prompts,
- obfuscated attacks,
- sensitive-data extraction attempts.

Keep train/validation/test splits separate if ML training is performed.

## Phase 9 — Testing

### Unit
- rules,
- scoring,
- sanitizer,
- policy engine.

### Integration
- frontend → backend,
- backend → security engine,
- backend → MongoDB,
- backend → LLM adapter.

### Security
- unauthorized admin access,
- prompt leakage,
- malicious input,
- oversized input,
- malformed JSON,
- provider timeout.

## Phase 10 — Docker

Create:
- frontend container,
- backend container,
- security-engine container,
- MongoDB service,
- optional Ollama service.

## Phase 11 — Documentation

README must include:
- project overview,
- architecture,
- prerequisites,
- environment variables,
- installation,
- startup,
- API overview,
- test instructions,
- ML evaluation,
- screenshots,
- limitations.

## Phase 12 — Final Polish

Before calling the project complete:
- remove placeholder text,
- remove debug logs,
- validate all API error states,
- validate RBAC,
- verify blocked prompts do not execute,
- verify dashboard analytics,
- verify Docker startup,
- add screenshots,
- update documentation.

## Definition of Done

The project is done when a new developer can clone the repository, follow the README, start the system locally, submit a prompt, see a security decision, optionally receive an LLM response, inspect the event in the dashboard, and understand why the decision occurred.
