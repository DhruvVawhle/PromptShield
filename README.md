# PromptShield

> **Secure Every Prompt** — Analyze, detect, and enforce security decisions before a single token reaches your LLM.

PromptShield is an enterprise-grade AI security gateway and management platform built on Next.js 16. Every inbound prompt is normalized, analyzed for adversarial threats, evaluated against deterministic custom security policies, scored for risk (0–100), and enforced (`ALLOW`, `WARN`, `SANITIZE`, or `BLOCK`) before it reaches underlying language models or external tools.

Featuring a **Hybrid Multi-Provider AI Gateway**, PromptShield intelligently combines **Google Gemini** (for live, up-to-date real-world knowledge) and **Groq LPUs** (for ultra-fast sub-500ms inference on `qwen/qwen3.8-27b`), with automatic bi-directional failover and historical cutoff disclaimer guardrails.

---

## ✨ Core Capabilities

| Stage | Capability | Description |
|:---|:---|:---|
| **Analyze** | Server-Side Security Engine | Zero-dependency heuristic rule engine with morphological stemmer, tokenization, Unicode and obfuscation normalization, adversarial pattern matching, sensitive data redaction, and deterministic policy resolution. |
| **Detect** | Threat Intelligence | Multi-category detection covering direct prompt injection, jailbreaks, system prompt extraction, persona hijacking, credential probing, and evasion with suffix-stripped stem matching. |
| **Track** | Full Prompt Auditing & Tracking | Real-time preservation of user prompts across Cloud Firestore, Dashboard Recent Events, and Incident Triage with one-click re-analysis, while stripping credentials via `redactSensitiveContent`. |
| **Enforce** | Guardrail Policies | Strictest-action-wins deterministic precedence engine with customizable risk thresholds and action overrides (`BLOCK`, `SANITIZE`, `WARN`, `ALLOW`). |
| **Gateway** | Hybrid Multi-Provider Routing | Intelligent router directing real-time/current data queries to Google Gemini (`gemini-flash-latest`, `gemini-3.8-flash`) and low-latency reasoning tasks to Groq (`qwen/qwen3.8-27b`), with transparent failover. |
| **Audit** | Immutable Audit Trail | Automatic, tamper-resistant audit logging for policy mutations, security decisions, unauthorized access attempts, and incident triaging with RFC 8785 canonical JSON and HMAC-SHA256 hash chaining. |
| **Triage** | Incident Resolution | End-to-end incident management with status lifecycle tracking (`OPEN`, `INVESTIGATING`, `RESOLVED`, `FALSE_POSITIVE`) and sanitized resolution notes. |
| **Diagnose** | Platform Telemetry | Continuous bounded liveness and readiness probes across Firestore, Upstash Redis, Google Gemini, Groq AI Engine, and the compiled rule engine. |
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
│   │   │   │   ├── chat/      # Multi-engine interactive chat with live provider selection (Hybrid/Gemini/Groq)
│   │   │   │   ├── incidents/ # Incident triage and review drawer
│   │   │   │   ├── policies/  # Custom guardrail policy management
│   │   │   │   ├── audit-logs/# Immutable audit log explorer with cryptographic chain verification
│   │   │   │   ├── users/     # Multi-tenant RBAC access management
│   │   │   │   └── system/    # Live platform telemetry and dependency health
│   │   │   └── api/
│   │   │       ├── ai/        # POST /api/ai (Secured hybrid inference gateway: Groq + Gemini)
│   │   │       ├── health/    # GET /api/health/gemini, /api/health/groq, /api/health/omniroute
│   │   │       └── v1/
│   │   │           ├── analyze/       # POST /api/v1/analyze (Security Engine)
│   │   │           ├── policies/      # GET, POST, PUT, DELETE /api/v1/policies
│   │   │           ├── audit-logs/    # GET /api/v1/audit-logs
│   │   │           ├── audit-logs/verify/ # POST /api/v1/audit-logs/verify
│   │   │           ├── system/status/ # GET /api/v1/system/status
│   │   │           ├── incidents/     # GET, PATCH /api/v1/incidents
│   │   │           └── users/         # GET, POST, PATCH /api/v1/users
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
│   │       │   ├── rate-limiter.ts
│   │       │   ├── rbac.ts
│   │       │   └── providers/ # Modular Multi-Provider Architecture
│   │       │       ├── provider-interface.ts
│   │       │       ├── gemini-provider.ts
│   │       │       ├── groq-provider.ts
│   │       │       ├── hybrid-provider.ts
│   │       │       └── index.ts
│   │       ├── audit-logs.ts  # Client SDK & shared types for Audit Logs
│   │       ├── incidents.ts   # Client SDK & shared types for Incidents
│   │       ├── system-status.ts# Client SDK & shared types for System Diagnostics
│   │       ├── gemini.ts      # Google Gemini client configuration & health
│   │       ├── groq.ts        # Direct Groq AI Engine client (LPU inference & streaming)
│   │       └── omniroute.ts   # Backward-compatibility alias for Groq AI engine
│   └── package.json
└── package.json               # Root workspace scripts
```

### 🌐 Architectural & Security Specifications

- **[`/security`](frontend/src/app/(public)/security/page.tsx) — Security Model & OWASP LLM Top 10 Matrix:**
  - Comprehensive vulnerability catalog addressing the **OWASP Top 10 for Large Language Models** (Direct Injection, Exfiltration, Jailbreaks, Indirect Poisoning, Obfuscation, Credential Probing, Tool Abuse, PII Exposure) with real-world exploit vectors and deterministic defense rules.
  - Interactive **Threat Inspection Simulator** that dynamically extracts risk signals, assigns normalized risk scores (0–100), and demonstrates fail-closed decision enforcement in real time.
  - Real-world **Wire Telemetry Inspector** detailing deterministic HTTP headers (`X-Security-Decision`, `X-Security-Risk-Score`, `X-PromptShield-Latency`, `X-AI-Provider`) and response codes (`200 OK`, `403 Forbidden`).
  - Architectural guarantees: zero prompt retention for model training, strict multi-tenant isolation, cryptographic HMAC audit logging, and fail-closed gateway resilience.

- **[`/architecture`](frontend/src/app/(public)/architecture/page.tsx) — End-to-End Reverse-Proxy Architecture:**
  - **3-Tier Infrastructure Topology:** Client Ingress (REST/OpenAI SDK) -> PromptShield Gateway Core (V8 normalization, heuristics, policy resolution) -> Inference & Audit Plane (Google Gemini, Groq LPU, Cloud Firestore).
  - **6-Stage Request/Response Pipeline:** Complete data contracts and sub-15ms execution latency across Ingress, Canonicalization, Heuristic Scanners, Risk Scoring, Policy Precedence, and Upstream Dispatch.
  - **2-Line SDK Drop-in Blueprint:** Transparent OpenAI SDK replacement across TypeScript, Python, and cURL by pointing `baseURL` directly to the PromptShield gateway.
  - **Gateway vs. Client-Side Guardrail Analysis:** Architectural comparison demonstrating why server-side edge proxies eliminate client-tampering vulnerabilities, token leakages, and malicious token billing.

---

## 🔌 API Reference

All `/api/v1/*` endpoints require authentication via Bearer token:
```http
Authorization: Bearer <firebase_id_token>
```
The server verifies tokens via Firebase Admin SDK with token revocation checks (`verifyIdToken(token, true)`). The user's `uid` and `tenantId` are derived exclusively from verified server-side credentials.

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
- **`GET /api/v1/policies`** — List all system and user-defined guardrail policies (requires `policies:read`).
- **`POST /api/v1/policies`** — Create a new custom guardrail policy with atomic audit logging (requires `policies:manage`).
- **`PUT /api/v1/policies/[id]`** — Update custom policy configuration, thresholds, or status (`Active` / `Disabled`). System policies cannot be modified (`403 Forbidden`).
- **`DELETE /api/v1/policies/[id]`** — Delete a custom policy with atomic audit logging. System policies cannot be deleted (`403 Forbidden`).

---

### 3. Audit Log Explorer & Cryptographic Verification API
- **`GET /api/v1/audit-logs`** — Retrieve audit records with HMAC signatures and hash chain hashes scoped strictly to the authenticated tenant (requires `audit:read`).
  - **Query Parameters:** `action`, `startDate`, `endDate`, `limit` (Default: `20`, Max: `100`), `cursor`.
- **`POST /api/v1/audit-logs/verify`** — Cryptographically verifies HMAC signatures and hash chain continuity across the tenant's audit trail, detecting any record modifications, reorderings, or deletions (requires `audit:verify`).

---

### 4. Team & Multi-Tenant Access Management (RBAC) API
- **`GET /api/v1/users`** — List organization members with server-verified roles (`SUPER_ADMIN`, `ADMIN`, `SECURITY_ANALYST`, `VIEWER`) and MFA status (requires `users:read`).
- **`POST /api/v1/users`** — Invite new team members with specific roles, with strict server-side privilege escalation prevention (requires `users:manage`).
- **`PATCH /api/v1/users/[id]`** — Update team member role or account status with permission hierarchy enforcement (requires `users:manage`).

---

### 5. System Health & Platform Diagnostics API
#### `GET /api/v1/system/status`
Reports process liveness and bounded dependency readiness probes (`≤ 3000ms` timeouts, 5-second memoization cache) across Firestore, Upstash Redis, Google Gemini, and Groq (requires `system:read`).

**Query Parameters:**
- `fresh`: Set to `"true"` to bypass cache and execute fresh dependency probes.

---

### 6. Incident Triage & Resolution API
- **`GET /api/v1/incidents`** — List owner-scoped security incidents with filters (`status`, `severity`, `category`, `startDate`, `endDate`) and cursor pagination (requires `incidents:read`).
- **`GET /api/v1/incidents/[id]`** — Retrieve detailed incident metadata (IDOR protected with uniform `404`, requires `incidents:read`).
- **`PATCH /api/v1/incidents/[id]`** — Update triage status (`OPEN`, `INVESTIGATING`, `RESOLVED`, `FALSE_POSITIVE`) and record sanitized resolution notes with automatic audit logging (requires `incidents:manage`).

---

### 7. Hybrid AI Inference Gateway API
#### `POST /api/ai`
Proxies validated prompts through the **PromptShield Hybrid Gateway**:
- **Automatic Routing:** Routes real-time, current-affairs, and entertainment queries (e.g. *upcoming releases, live events, sports, elections, prices*) to **Google Gemini** (`gemini-flash-latest`, `gemini-3.8-flash`). Routes fast reasoning, code analysis, and standard Q&A to **Groq LPUs** (`qwen/qwen3.8-27b`) at 460ms speed.
- **Provider Override:** Callers can explicitly specify `"provider": "gemini"`, `"provider": "groq"`, or `"provider": "hybrid"`.
- **Pre-Execution Enforcement:** Prompts evaluated as `BLOCK` terminate immediately (`403 Forbidden`) and never reach any provider. Prompts evaluated as `SANITIZE` pass only stripped safe text.
- **Fail-Closed Resilience:** Fails closed (`502` / `429`) if rate limits or persistence checks fail.
- **SSE Token Streaming:** Full server-sent event token streaming with `X-AI-Provider` and `X-AI-Routing-Reason` telemetry headers.

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
   - All database reads, updates, and deletes verify document ownership against the verified tenant boundary, returning uniform `404 Not Found` for unowned documents to prevent identifier enumeration.
5. **Fail-Closed Rate Limiting Guarantees**:
   - In production (`NODE_ENV=production`), distributed Upstash rate limiting is strictly mandatory. If Redis credentials are unconfigured or an outage occurs, requests fail closed (HTTP 503/429) to protect upstream providers. In-memory fallback is strictly restricted to development/test environments.
   - Cloudflare headers (`CF-Connecting-IP`, `True-Client-IP`) are trusted only when `TRUST_CLOUDFLARE=true` or `DEPLOYMENT_PLATFORM=cloudflare`. Direct-origin access without verified proxy infrastructure strictly ignores client-supplied proxy headers to prevent IP rotation spoofing.
6. **Cryptographic Audit Integrity vs. Storage Immutability**:
   - Every audit log record is canonicalized using RFC 8785 deterministic JSON key ordering, signed with a dedicated server secret `AUDIT_SIGNING_KEY` using HMAC-SHA256, and chained to its predecessor's SHA-256 digest (`previousHash`).
   - Concurrency safety is maintained via atomic transactions over `audit_chain_heads/{uid}`.
   - Client APIs enforce append-only semantics by returning HTTP 405 Method Not Allowed on POST, PUT, PATCH, and DELETE operations.
   - *Security Guarantees & Limitations*: PromptShield provides **application-level cryptographic tamper-evidence and chain verification**, not hardware-enforced write-once-read-many (WORM) storage. While raw Firestore documents can be mutated by high-privilege GCP IAM service accounts, any modified payload, deleted record, or reordered sequence breaks the cryptographic HMAC signature and hash chain, immediately detected by `/api/v1/audit-logs/verify`.
7. **Server-Side Role-Based Access Control (RBAC)**:
   - Enforces a 4-tier permission hierarchy (`SUPER_ADMIN`, `ADMIN`, `SECURITY_ANALYST`, `VIEWER`) verified on every sensitive API request.
   - Prevents privilege escalation and isolates tenant access boundaries.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 20+
- A [Firebase](https://firebase.google.com/) project (with Firestore and Authentication enabled)
- [Upstash Redis](https://upstash.com/) for distributed rate limiting (mandatory in production)
- A [Groq](https://console.groq.com/keys) API Key (`qwen/qwen3.8-27b`)
- A [Google Gemini](https://aistudio.google.com/) API Key (`gemini-flash-latest`, `gemini-3.8-flash`)
- A 32-byte secret for `AUDIT_SIGNING_KEY` (HMAC audit signing)

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

# Google Gemini AI Engine Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-latest
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# Cryptographic Audit Signing Key
AUDIT_SIGNING_KEY=your-32-byte-cryptographic-signing-key

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

# Upstash Redis (Mandatory in Production)
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

PromptShield includes an extensive, zero-mock/high-fidelity automated test suite validating the entire security architecture across 13 test files and 19 test suites:

| Test File | Test Suite Focus | Test Cases |
|:---|:---|:---:|
| `adversarial-security.test.ts` | Base64/Hex encoding, zero-width obfuscation, exfiltration smuggling, indirect injection, and fail-closed sanitization | 10 |
| `api-integration.test.ts` | 4 Sub-suites: AI Gateway proxy, `/api/v1/analyze` persistence, deterministic policy precedence, Firestore rule locks | 17 |
| `audit-integrity.test.ts` | RFC 8785 canonical JSON, HMAC-SHA256 signatures, hash chaining, gap detection, key rotation, restart recovery | 12 |
| `audit-logs.test.ts` | Audit query filters, cursor pagination, RBAC scopes, credential scrubbing | 16 |
| `decision-enforcement.test.ts` | AI Provider boundary enforcement: proves ALLOW/WARN forward, SANITIZE forwards safe content only, BLOCK terminates upstream | 6 |
| `e2e-workflow.test.ts` | End-to-end lifecycle: Auth -> Policy CRUD -> Analyze -> Incident Triage -> Audit Verification -> Health Check | 6 |
| `gemini-provider.test.ts` | Google Gemini provider: non-streaming, SSE chunk parsing, intelligent recency routing, failover resilience | 10 |
| `incidents.test.ts` | Incident triaging lifecycle, status transitions, resolution notes sanitization, IDOR protection | 19 |
| `policies.test.ts` | Policy CRUD, action/status validation, deterministic tiebreak, atomic audit transaction | 15 |
| `rate-limiter.test.ts` | Production fail-closed resilience, Cloudflare/Proxy header extraction, anti-spoofing, concurrent bursts | 7 |
| `rbac.test.ts` | 4 Role tiers (SUPER_ADMIN, ADMIN, SECURITY_ANALYST, VIEWER), privilege escalation prevention, cross-tenant IDOR | 10 |
| `security-engine.test.ts` | Core normalization, morphological stemmer, 11 attack categories, heuristic scoring, edge cases | 38 |
| `system-status.test.ts` | Multi-dependency health diagnostics (database, cache, AI provider, engine), TTL caching, timeout handling | 8 |
| **Total** | **13 Test Files · 19 Test Suites · 0 Skipped · 0 Duplicated** | **168** |

### Running Synchronous Quality Gates

```bash
# 1. Run all 168 automated tests synchronously
npm test

# 2. Run TypeScript strict type-check (0 errors)
npx --prefix frontend tsc --project frontend/tsconfig.json --noEmit

# 3. Run ESLint code quality check (0 errors)
npm run lint

# 4. Run Next.js Production Build (Compiles all 38 routes in Turbopack)
npm run build
```

---

## 🔒 Security Architecture Guarantees

### 1. Multi-Tenant Organization Isolation & IDOR Protection
- **Server-Resolved Identity:** Tenant identity (`tenantId`) is derived exclusively on the server from user database records or verified token custom claims. It defaults to the user's `uid` for personal instances.
- **Client Header Tamper Resistance:** Client-supplied headers (e.g. `X-Tenant-ID`) or query parameters (e.g. `?tenantId=...`) are strictly ignored.
- **Uniform 404 IDOR Defense:** Access attempts targeting records owned by another tenant (policies, incidents, user roles, audit trails) return a uniform `404 Not Found` to prevent resource enumeration.
- **Scoped User Management:** The `/api/v1/users` management endpoints partition member listings and role assignments strictly within the authenticated tenant boundary.

### 2. Edge Proxy Security & IP Identification
- **Cloudflare Verification:** Edge headers (`CF-Connecting-IP`, `True-Client-IP`) are only parsed when `TRUST_CLOUDFLARE=true` or `DEPLOYMENT_PLATFORM=cloudflare` is explicitly configured. Direct origin requests cannot spoof edge headers.
- **Reverse Proxy Header Stripping:** Standard reverse proxies (`X-Forwarded-For`, `X-Real-IP`) require `TRUST_PROXY=true`. When operating behind multi-hop proxies, `TRUST_PROXY_HOPS` ensures client address extraction begins before trusted infrastructure hops.
- **Direct-Origin Isolation:** Direct callers connecting to the origin without trusted proxy infrastructure in production are isolated under `untrusted-direct-origin` rather than falsely trusted loopback (`127.0.0.1`).

### 3. Cryptographic Audit Integrity vs. Storage Immutability
- **Cryptographic Tamper-Evidence:** Every administrative mutation and security decision is signed using HMAC-SHA256 (`AUDIT_SIGNING_KEY`), serialized via RFC 8785 Canonical JSON, and chained via SHA-256 hash pointers (`previousHash`). Any altered, deleted, or reordered record breaks the chain and is flagged immediately.
- **Application-Level vs. Storage-Level Immutability:** Hash chaining provides application-level mathematical proof of tamper-evidence. It does not replace storage-level WORM (Write Once, Read Many) or cloud provider retention locks. Cloud Firestore write-access is blocked for web clients via `firestore.rules`, but cloud administrators with project owner credentials can mutate Firestore directly. For compliance-grade non-repudiation, audit logs should be replicated to Google Cloud Storage with a Bucket Lock Retention Policy.

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
| AI Inference Engines | [Google Gemini](https://ai.google.dev/) (`gemini-flash-latest`, `gemini-3.8-flash`) & [Groq](https://groq.com/) (`qwen/qwen3.8-27b`) |

---

## 📄 License

This project is licensed under the Apache 2.0 License.
