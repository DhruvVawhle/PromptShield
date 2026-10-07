# PromptShield — Tech Stack & Architecture

## 1. Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React.js | Dashboard, playground, admin UI |
| Backend | Node.js + Express.js | API gateway, authentication, orchestration |
| Security/ML | Python 3.x | Detection, scoring, sanitization |
| NLP/ML | Hugging Face Transformers | Embeddings/classification |
| AI orchestration | LangChain | Optional model/pipeline orchestration |
| Database | MongoDB | Users, events, policies, analytics |
| Local LLM | Ollama | Local inference |
| Cloud LLM | OpenAI API | Optional cloud inference |
| Containerization | Docker | Reproducible local deployment |
| Version control | Git/GitHub | Source control |
| IDE | VS Code | Development |

## 2. Layered Architecture

```text
                    ┌─────────────────────────┐
                    │        React UI         │
                    │ Dashboard / Playground  │
                    │ Admin / Incidents       │
                    └────────────┬────────────┘
                                 │ HTTPS/JSON
                    ┌────────────▼────────────┐
                    │   Node.js + Express     │
                    │ API / Auth / RBAC        │
                    │ Request Orchestration    │
                    └───────┬─────────┬───────┘
                            │         │
                 analyze   │         │ LLM execution
                            │         │
              ┌────────────▼───┐   ┌─▼────────────────┐
              │ Python Security │   │ LLM Adapter Layer│
              │ Engine          │   │ Ollama / OpenAI  │
              │                 │   │ / Future         │
              │ Rules           │   └──────────────────┘
              │ ML Detection    │
              │ Risk Scoring    │
              │ Sanitization    │
              │ Guardrails      │
              └───────┬─────────┘
                      │
              ┌───────▼─────────┐
              │    MongoDB      │
              │ Users           │
              │ Security Events │
              │ Policies        │
              │ Audit Logs      │
              └─────────────────┘
```

## 3. Security Request Pipeline

```text
Raw Prompt
   ↓
Input Validation
   ↓
Normalization
   ↓
Rule-Based Detection
   ↓
ML / Transformer Detection
   ↓
Risk Aggregation
   ↓
Policy / Guardrail Evaluation
   ↓
Decision
 ┌──────┼────────┬─────────┐
 ↓      ↓        ↓         ↓
ALLOW  WARN   SANITIZE   BLOCK
 ↓      ↓        ↓
LLM    LLM*     LLM
       (*policy-dependent)
```

## 4. Recommended Repository Structure

```text
promptshield/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── models/
│   │   ├── adapters/
│   │   ├── auth/
│   │   └── config/
│   └── package.json
│
├── security-engine/
│   ├── app/
│   │   ├── detectors/
│   │   ├── rules/
│   │   ├── scoring/
│   │   ├── sanitizer/
│   │   ├── guardrails/
│   │   ├── schemas/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
│
├── datasets/
│   ├── attacks/
│   ├── benign/
│   └── evaluation/
│
├── docs/
├── docker/
├── scripts/
├── .env.example
├── docker-compose.yml
└── README.md
```

## 5. Responsibility Rules

### Frontend
Never:
- store OpenAI keys,
- make direct database calls,
- implement the authoritative security decision.

### Node Backend
Responsible for:
- API contract,
- authentication,
- RBAC,
- request validation,
- orchestration,
- database access,
- LLM adapter calls,
- audit logging.

### Python Security Engine
Responsible for:
- prompt normalization,
- deterministic rules,
- ML inference,
- risk scoring,
- sanitization,
- security explanation metadata.

### MongoDB
Responsible for persistence only.

### LLM Adapter
Responsible for translating the normalized/sanitized request to a provider-specific API.

## 6. Provider Adapter Interface

Conceptually:

```ts
interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
  healthCheck(): Promise<ProviderHealth>;
}
```

Implement:
- OllamaProvider
- OpenAIProvider

Future providers should not require changes to the security engine.

## 7. Security Engine Interface

Input:

```json
{
  "requestId": "uuid",
  "prompt": "string",
  "context": {},
  "policy": {}
}
```

Output:

```json
{
  "isMalicious": false,
  "riskScore": 0,
  "riskLevel": "LOW",
  "decision": "ALLOW",
  "categories": [],
  "signals": [],
  "sanitizedPrompt": null,
  "explanation": []
}
```

## 8. Risk Scoring

Use a normalized 0–100 score.

Example weighted signals:

- deterministic rule severity,
- ML classifier probability,
- attack category severity,
- obfuscation indicator,
- instruction hierarchy manipulation,
- sensitive-data extraction indicator,
- policy violation.

Do not expose raw model probabilities as if they were calibrated probabilities unless calibration has been evaluated.

## 9. Data Flow Rule

The original prompt must never be forwarded to the LLM when the final decision is `BLOCK`.

For `SANITIZE`, only the sanitized prompt may be forwarded.

For `WARN`, forwarding must depend on the active policy.

## 10. Deployment

Development:
- React frontend
- Express backend
- Python security service
- MongoDB
- Ollama

Docker Compose should provide a reproducible local environment.

Cloud deployment can be added later, but the personal project should remain fully functional locally.
