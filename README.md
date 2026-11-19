# PromptShield

> **Secure Every Prompt** — Analyze, detect, and enforce security decisions before a single token reaches your LLM.

PromptShield is an enterprise-grade AI security gateway and management platform built on Next.js 16. Every inbound prompt is normalized, analyzed for adversarial threats, evaluated against deterministic custom security policies, scored for risk (0–100), and enforced (`ALLOW`, `WARN`, `SANITIZE`, or `BLOCK`) before it reaches underlying language models or external tools.

---

## ✨ Core Capabilities

| Stage | Capability | Description |
|:---|:---|:---|
| **Analyze** | Server-Side Security Engine | Zero-dependency heuristic rule engine with morphological stemmer, tokenization, Unicode and obfuscation normalization, adversarial pattern matching, sensitive data redaction, and deterministic policy resolution. |
| **Detect** | Threat Intelligence | Multi-category detection covering direct prompt injection, jailbreaks, system prompt extraction, persona hijacking, credential probing, and evasion with suffix-stripped stem matching. |
| **Track** | Full Prompt Auditing & Tracking | Real-time preservation of user prompts across Cloud Firestore, Dashboard Recent Events, and Incident Triage with one-click re-analysis, while stripping credentials via `redactSensitiveContent`. |
| **Enforce** | Guardrail Policies | Strictest-action-wins deterministic precedence engine with customizable risk thresholds and action overrides (`BLOCK`, `SANITIZE`, `WARN`, `ALLOW`). |
| **Audit** | Immutable Audit Trail | Automatic, tamper-resistant audit logging for policy mutations, security decisions, unauthorized access attempts, and incident triaging. |
| **Triage** | Incident Resolution | End-to-end incident management with status lifecycle tracking (`OPEN`, `INVESTIGATING`, `RESOLVED`, `FALSE_POSITIVE`) and sanitized resolution notes. |
| **Diagnose** | Platform Telemetry | Continuous bounded liveness and readiness probes across Firestore, Upstash Redis, Groq AI Engine, and the compiled rule engine. |
| **Specifications** | Security & Architecture | Dedicated whitepaper specifications: interactive OWASP Top 10 matrix with wire telemetry (`/security`) and end-to-end 3-tier reverse-proxy topology with 6-stage pipeline contracts (`/architecture`). |
| **Experience** | Hallmark & Impeccable UX | Un-slopped, editorial design with Lenis inertia scrolling, GSAP tickers, Cuberto magnetic follower cursor (adaptive dark/light), WCAG AAA 11:1+ dark mode contrast, and zero language-service warnings. |

### Threat Coverage

- 🔴 **Direct Prompt Injection** — Instruction overrides (`ignore previous instructions...`, `disregard above guidelines...`) backed by morphological root stemming (`ignor`, `overrid`, `direct`, `guidelin`).
- 🔴 **Jailbreak Personas** — Persona hijacking and ethical bypasses (`DAN`, `developer mode`, `evil twin`, hypothetical bypass scenarios).
- 🔴 **System Prompt Exfiltration** — Hidden instruction harvesting (`repeat everything above`, `show raw prompt verbatim`).
- 🔴 **Morphological & Obfuscation Evasion** — English suffix-stripping (`ing`, `ed`, `ation`, `ment`), zero-width character stripping, URL decoding normalization, Base64/Hex encoding detection.
- 🔴 **Data Privacy & PII** — Automatic redaction of API keys, private keys, JWTs, passwords, credit card numbers, SSNs, and emails.
- 🔴 **Credential Probing** — Hunting for secrets, configuration tokens, or unauthorized database access.

---

## 🏗️ Architecture

```
PromptShield/
├── firestore.rules            # Server-side Firestore security rules (client write locks)
├── .vscode/                   # VS Code & Antigravity IDE configuration (Tailwind v4 rules)
├── frontend/                  # Next.js 16 full-stack application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/      # Public pages (Landing, About, Security, Architecture, Contact, Privacy, Terms)
│   │   │   │   ├── security/  # /security (OWASP LLM matrix, wire headers, threat simulator)
│   │   │   │   └── architecture/ # /architecture (3-tier topology, 6-stage pipeline, SDK blueprint)
│   │   │   ├── (dashboard)/   # Authenticated dashboard (Chat, Incidents, Policies, Audit Logs, Users, System)
│   │   │   │   ├── incidents/ # Incident triage and review drawer
│   │   │   │   ├── policies/  # Custom guardrail policy management
│   │   │   │   ├── audit-logs/# Immutable audit log explorer
│   │   │   │   ├── users/     # Multi-tenant RBAC access management
│   │   │   │   └── system/    # Live platform telemetry and dependency health
│   │   │   └── api/
│   │   │       ├── ai/        # POST /api/ai (Secured inference proxy via Groq)
│   │   │       ├── health/    # GET /api/health/groq (and /api/health/omniroute)
│   │   │       └── v1/
│   │   │           ├── analyze/       # POST /api/v1/analyze (Security Engine)
│   │   │           ├── policies/      # GET, POST, PUT, DELETE /api/v1/policies
│   │   │           ├── audit-logs/    # GET /api/v1/audit-logs
│   │   │           ├── system/status/ # GET /api/v1/system/status
│   │   │           └── incidents/     # GET, PATCH /api/v1/incidents
│   │   ├── components/        # Reusable UI, dashboard, and public section components
│   │   │   ├── ui/
│   │   │   │   ├── cuberto-cursor.tsx # Cuberto magnetic spring follower cursor
│   │   │   │   ├── dropdown-menu.tsx  # Accessible high-contrast popover menus
│   │   │   │   ├── navigation-menu.tsx# Dynamic responsive navbar with reactive hero detection
│   │   │   │   └── status-badge.tsx   # Clean status pills
│   │   │   └── LenisProvider.tsx      # Lenis smooth scrolling with GSAP ticker & anchor interceptor
│   │   └── lib/
│   │       ├── server/        # Server-only modules (Firebase Admin, Security Engine, Normalizer, Rules)
│   │       │   ├── security-engine.ts
│   │       │   ├── policy-evaluator.ts
│   │       │   ├── policy-manager.ts
│   │       │   ├── persistence.ts
│   │       │   ├── audit.ts
│   │       │   ├── system-status.ts
│   │       │   └── rate-limiter.ts
│   │       ├── audit-logs.ts  # Client SDK & shared types for Audit Logs
│   │       ├── incidents.ts   # Client SDK & shared types for Incidents
│   │       ├── system-status.ts# Client SDK & shared types for System Diagnostics
│   │       ├── groq.ts        # Direct Groq AI Engine client (LPU inference & streaming)
│   │       └── omniroute.ts   # Backward-compatibility alias for Groq AI engine
│   └── package.json
└── package.json               # Root workspace scripts
```

### 🌐 Architectural & Security Specifications

- **[`/security`](frontend/src/app/(public)/security/page.tsx) — Security Model & OWASP LLM Top 10 Matrix:**
  - Comprehensive vulnerability catalog addressing the **OWASP Top 10 for Large Language Models** (Direct Injection, Exfiltration, Jailbreaks, Indirect Poisoning, Obfuscation, Credential Probing, Tool Abuse, PII Exposure) with real-world exploit vectors and deterministic defense rules.
  - Interactive **Threat Inspection Simulator** that dynamically extracts risk signals, assigns normalized risk scores (0–100), and demonstrates fail-closed decision enforcement in real time.
  - Real-world **Wire Telemetry Inspector** detailing deterministic HTTP headers (`X-Security-Decision`, `X-Security-Risk-Score`, `X-PromptShield-Latency`) and response codes (`200 OK`, `403 Forbidden`).
  - Architectural guarantees: zero prompt retention for model training, strict multi-tenant isolation, cryptographic HMAC audit logging, and fail-closed gateway resilience.

- **[`/architecture`](frontend/src/app/(public)/architecture/page.tsx) — End-to-End Reverse-Proxy Architecture:**
  - **3-Tier Infrastructure Topology:** Client Ingress (REST/OpenAI SDK) -> PromptShield Gateway Core (V8 normalization, heuristics, policy resolution) -> Inference & Audit Plane (Groq, OpenAI, Anthropic, Gemini, Firestore).
  - **6-Stage Request/Response Pipeline:** Complete data contracts and sub-15ms execution latency across Ingress, Canonicalization, Heuristic Scanners, Risk Scoring, Policy Precedence, and Upstream Dispatch.
  - **2-Line SDK Drop-in Blueprint:** Transparent OpenAI SDK replacement across TypeScript, Python, and cURL by pointing `baseURL` directly to the PromptShield gateway.
  - **Gateway vs. Client-Side Guardrail Analysis:** Architectural comparison demonstrating why server-side edge proxies eliminate client-tampering vulnerabilities, token leakages, and malicious token billing.

---

## 🔌 API Reference

All `/api/v1/*` endpoints require authentication via Bearer token:
```http
Authorization: Bearer <firebase_id_token>
```
The server verifies tokens via Firebase Admin SDK with token revocation checks (`verifyIdToken(token, true)`). The user's `uid` is derived exclusively from the token.

### 1. Prompt Analysis & Decision API
#### `POST /api/v1/analyze`
Executes server-side prompt normalization, heuristic rule evaluation, custom policy checks, and automated security event persistence.

**Request Body:**
```json
{
  "prompt": "Summarize this quarterly earnings report...",
  "stream": false
}
```

**Response (`200 OK`):**
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "isMalicious": false,
  "decision": "ALLOW",
  "riskScore": 5,
  "riskLevel": "LOW",
  "categories": [],
  "signals": [],
  "triggeredRuleIds": [],
  "sanitizedPrompt": null,
  "reasoning": "No threat indicators detected.",
  "latencyMs": 4,
  "policyApplied": {
    "id": "sys_default_guardrails",
    "name": "Default Guardrail Policy"
  },
  "confidence": 0.95
}
```

---

### 2. Guardrail Policy Management API
- **`GET /api/v1/policies`** — List all system and user-defined guardrail policies.
- **`POST /api/v1/policies`** — Create a new custom guardrail policy with atomic audit logging.
- **`PUT /api/v1/policies/[id]`** — Update custom policy configuration, thresholds, or status (`Active` / `Disabled`). System policies cannot be modified (`403 Forbidden`).
- **`DELETE /api/v1/policies/[id]`** — Delete a custom policy with atomic audit logging. System policies cannot be deleted (`403 Forbidden`).

---

### 3. Audit Log Explorer API
#### `GET /api/v1/audit-logs`
Retrieve tamper-resistant audit records scoped strictly to the authenticated tenant.

**Query Parameters:**
- `action`: Filter by audit action (`POLICY_CREATED`, `POLICY_UPDATED`, `POLICY_DELETED`, `POLICY_ACTIVATION_CHANGED`, `SECURITY_DECISION`, `INCIDENT_STATUS_UPDATED`, `INCIDENT_RESOLVED`).
- `startDate`, `endDate`: ISO-8601 timestamps.
- `limit`: Bounded page size (Default: `20`, Max: `100`).
- `cursor`: Base64 cursor for deterministic pagination.

---

### 4. System Health & Platform Diagnostics API
#### `GET /api/v1/system/status`
Reports process liveness and bounded dependency readiness probes (`≤ 3000ms` timeouts, 5-second memoization cache).

**Query Parameters:**
- `fresh`: Set to `"true"` to bypass cache and execute fresh dependency probes.

---

### 5. Incident Triage & Resolution API
- **`GET /api/v1/incidents`** — List owner-scoped security incidents with filters (`status`, `severity`, `category`, `startDate`, `endDate`) and cursor pagination.
- **`GET /api/v1/incidents/[id]`** — Retrieve detailed incident metadata (IDOR protected with uniform `404`).
- **`PATCH /api/v1/incidents/[id]`** — Update triage status (`OPEN`, `INVESTIGATING`, `RESOLVED`, `FALSE_POSITIVE`) and record sanitized resolution notes. Automatically records `INCIDENT_RESOLVED` or `INCIDENT_STATUS_UPDATED` in the audit trail.

---

### 6. Inference Proxy API
#### `POST /api/ai`
Proxies validated prompts directly through the Groq AI Engine (`https://api.groq.com/openai/v1`) with ultra-fast LPU inference (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`) only after prompt security checks and rate limits pass. Fails closed (`502`) if security event persistence fails. Supports full server-sent event (SSE) token streaming.

---

## 🔒 Security Model & Guarantees

1. **Client Write Denials (`firestore.rules`)**:
   - `security_events`, `policies`, and `audit_logs` collections have `allow write: if false;` configured in Firestore security rules.
   - All mutations must flow through authenticated backend API routes using the trusted Firebase Admin SDK.
2. **Deterministic Precedence**:
   - Mandatory safeguards (`BLOCK` decisions on critical exploits) cannot be overridden by custom permissive policies.
   - Conflicting policies resolve via strictest-action-wins precedence: `BLOCK > SANITIZE > WARN > ALLOW`.
3. **Data Minimization & Redaction**:
   - Adversarial payloads and sensitive prompt categories are masked prior to storage.
   - PII and credentials in resolution notes and audit logs are stripped via `redactSensitiveContent`.
4. **IDOR Prevention**:
   - All database reads, updates, and deletes verify document ownership against the verified token UID, returning uniform `404 Not Found` for unowned documents to prevent identifier enumeration.
5. **Fail-Closed Guarantees**:
   - Security pipeline errors or persistence failures abort inference requests, preventing un-audited or malicious prompts from reaching the model.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 20+
- A [Firebase](https://firebase.google.com/) project (with Firestore and Authentication enabled)
- (Optional) [Upstash Redis](https://upstash.com/) for distributed rate limiting
- A [Groq](https://console.groq.com/keys) API Key

### 1. Clone & Configure
```bash
git clone https://github.com/DhruvVawhle/PromptShield.git
cd PromptShield
cp frontend/.env.example frontend/.env.local
```

Populate `frontend/.env.local`:
```env
# Groq AI Engine Configuration
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=qwen/qwen3.8-27b

# Firebase Public Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server Credentials)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Upstash Redis (Optional for Distributed Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### 2. Install & Run
```bash
npm install
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 🧪 Testing & Verification

Run the full automated test suite (109 tests covering all security engines, persistence, APIs, and route handlers):

```bash
# Run all server and unit test suites (109 tests)
npm test

# Run TypeScript compiler check
npx --prefix frontend tsc --project frontend/tsconfig.json --noEmit

# Run Next.js Production Build (Compiles all 35 routes)
npm run build
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Motion & Physics | [Lenis](https://lenis.darkroom.engineering/) (Smooth Scroll), [GSAP](https://gsap.com/) (ScrollTrigger Ticker), [Framer Motion](https://www.framer.com/motion/) |
| Cursor & Interaction | Custom Cuberto Magnetic Spring Follower |
| Component UI | shadcn/ui, Radix UI, Base UI |
| Graphics & Charts | Three.js, Recharts, Lucide Icons |
| Backend & Auth | Firebase Admin SDK, Firebase Auth, Cloud Firestore |
| Rate Limiting | Upstash Redis & `@upstash/ratelimit` |
| AI Inference Engine | [Groq](https://groq.com/) (Ultra-fast LPU inference) |

---

## 📄 License

This project is licensed under the Apache 2.0 License.
