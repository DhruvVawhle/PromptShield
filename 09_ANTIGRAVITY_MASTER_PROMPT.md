# PromptShield — Master Build Instruction for an AI Coding Agent

You are the lead software engineer responsible for implementing **PromptShield**, a personal AI-security project.

## Mission

Build a production-quality local web application that acts as a security gateway between users/applications and Large Language Models.

PromptShield must:
- analyze prompts,
- detect prompt injection and related attacks,
- calculate explainable risk,
- sanitize when appropriate,
- enforce guardrails,
- allow/warn/sanitize/block requests,
- optionally forward safe prompts to an LLM,
- log security events,
- expose analytics,
- implement RBAC.

## Important Product Boundary

PromptShield is NOT the LLM.

It is the security layer in:

`Client → PromptShield → LLM`

Never bypass PromptShield to call the LLM from the frontend.

## Source Requirements

The original project abstract defines:
- React.js
- Node.js + Express.js
- MongoDB
- Python 3.x
- Hugging Face Transformers
- LangChain
- Ollama and/or OpenAI API
- Docker
- Git/GitHub

Preserve these technologies unless a documented implementation constraint requires an adjustment.

## Architecture

Use separate layers:

1. React frontend
2. Express backend/API
3. Python security engine
4. MongoDB
5. LLM provider adapters

Do not put ML logic into React.
Do not put database logic into React.
Do not put provider API keys in React.

## Build Order

Follow this order and keep the application runnable after each phase:

1. repository structure
2. backend health endpoint
3. MongoDB connection
4. Python security service
5. deterministic detection rules
6. risk scoring
7. backend-to-Python integration
8. LLM provider abstraction
9. Ollama integration
10. OpenAI integration
11. authentication
12. RBAC
13. event logging
14. dashboard
15. playground
16. incident detail
17. policies
18. analytics
19. tests
20. Docker
21. documentation

## Detection Strategy

Implement defense in depth.

Do not rely on a single regex or a single ML prediction.

The security engine should combine:
- normalization,
- deterministic rules,
- transformer/ML detection,
- risk aggregation,
- policy checks.

The output must include:
- decision,
- risk score,
- risk level,
- categories,
- signals,
- explanation,
- sanitized prompt when applicable.

## Decisions

Use:
- ALLOW
- WARN
- SANITIZE
- BLOCK

If BLOCK is returned, the backend must not execute the LLM request.

If SANITIZE is returned, execute only the sanitized prompt.

WARN behavior must be controlled by policy.

## API Contract

Implement:

`POST /api/v1/analyze`

Input:
```json
{
  "prompt": "string",
  "provider": "ollama|openai",
  "model": "string",
  "sessionId": "string",
  "execute": true
}
```

Output:
```json
{
  "requestId": "uuid",
  "decision": "ALLOW",
  "riskScore": 0,
  "riskLevel": "LOW",
  "categories": [],
  "signals": [],
  "sanitizedPrompt": null,
  "llmResponse": null,
  "provider": "ollama",
  "model": "string",
  "latencyMs": 0
}
```

## UI

Build these screens:

- Dashboard
- Prompt Playground
- Incidents
- Incident Detail
- Analytics
- Policies
- Users
- Audit Logs
- System / Providers

The UI should feel like an enterprise AI security product.

Avoid:
- fake hacker visuals,
- excessive neon,
- meaningless animations,
- giant decorative elements,
- blank screens on API failure.

Every page needs loading, empty, error, and success states.

## Database

Create collections for:
- users
- security_events
- policies
- audit_logs

Add useful indexes.

## Security

Never commit secrets.

Create `.env.example`.

Never return provider credentials to the browser.

Do not store full sensitive prompts unless the user explicitly enables raw-prompt logging.

Use RBAC for admin functions.

## Testing

Write tests for:
- benign prompts,
- direct injection,
- jailbreak,
- prompt leakage,
- role escalation,
- obfuscation,
- sensitive extraction,
- sanitization,
- blocked execution,
- RBAC,
- provider failures.

Every security bug discovered during implementation becomes a regression test.

## ML Evaluation

Do not invent model accuracy.

If a model is trained or evaluated:
- document dataset source,
- dataset size,
- class distribution,
- train/validation/test split,
- model,
- version,
- metrics,
- evaluation date.

## Engineering Rules

- Prefer modular code.
- Keep security decisions deterministic and inspectable.
- Use clear TypeScript/Python types/models where applicable.
- Validate external inputs.
- Use structured errors.
- Keep configuration outside source code.
- Do not silently create fake API responses.
- Do not mark features as complete unless they work.
- If a dependency is unavailable, implement a clean interface and document the limitation.
- Do not remove an existing working feature merely to simplify implementation.
- Update documentation whenever architecture changes.

## Required Deliverables

At the end, the repository should contain:

```text
promptshield/
├── frontend/
├── backend/
├── security-engine/
├── datasets/
├── docs/
├── docker/
├── tests/
├── .env.example
├── docker-compose.yml
└── README.md
```

The README must explain exactly how to install, configure, run, test, and understand the project.

## Working Style

Before changing architecture, inspect the existing repository.

If code already exists:
- preserve useful existing work,
- refactor only when needed,
- do not rewrite blindly.

After each major feature:
1. run tests,
2. check logs,
3. verify the API,
4. verify the UI,
5. update documentation.

The final result should be a coherent personal project that can be demonstrated locally from end to end.
