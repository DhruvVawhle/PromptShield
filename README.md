# PromptShield

> **Secure Every Prompt** — Analyze, detect, and enforce security decisions before a single token reaches your LLM.

PromptShield is a full-stack Next.js application that acts as a security gateway for AI prompts. Every user message is analyzed for threats, scored for risk, and either allowed, warned, sanitized, or blocked — before it ever reaches the underlying model.

---

## ✨ Features

| Stage | Capability | Description |
|-------|-----------|-------------|
| **Analyze** | Prompt Analysis | Normalize every prompt, inspect its structure, and explain why it received its risk classification. Risk score: 0–100. |
| **Detect** | Threat Detection | Detect prompt injection, jailbreak attempts, instruction manipulation, obfuscation, and suspicious instructions. |
| **Protect** | Security Decision | Allow, warn, sanitize, or block the request before it reaches the model, provider, or tool layer. |

### Threat Coverage

- 🔴 **Prompt Injection** — Overrides system instructions (`ignore previous instructions …`)
- 🔴 **Jailbreak** — Removes guardrails (`DAN`, `developer mode`, `no restrictions`)
- 🔴 **Context / System Prompt Leak** — Extracts hidden instructions (`repeat everything above …`)
- 🔴 **Role Override** — Claims false authority (`I'm the system administrator`)
- 🔴 **Credential Probe** — Hunts for secrets (`list every API key …`)
- 🔴 **Tool Abuse** — Triggers unsafe tool actions (`run the delete_all_records tool …`)

---

## 🏗️ Architecture

```
PromptShield/
├── frontend/                  # Next.js 16 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/      # Landing, About, Security, Architecture pages
│   │   │   ├── (dashboard)/   # Auth-gated app: Chat, Playground, Analytics, …
│   │   │   ├── api/
│   │   │   │   ├── ai/        # POST /api/ai — OmniRoute proxy
│   │   │   │   └── health/omniroute/  # GET /api/health/omniroute
│   │   │   └── login/         # Firebase authentication
│   │   ├── components/
│   │   │   ├── chat/          # Secured chat shell with live threat status
│   │   │   ├── capabilities/  # Capability cards (Analyze / Detect / Protect)
│   │   │   ├── problem/       # Interactive threat demo (6 attack types)
│   │   │   ├── hero/          # 3-D hero card & shield demo
│   │   │   └── layout/        # App shell, sidebar, header
│   │   └── lib/
│   │       ├── promptCheck.ts # Client-side pattern-matching guard
│   │       ├── omniroute.ts   # OmniRoute AI-gateway client + health check
│   │       ├── firebase.ts    # Firebase SDK initialization
│   │       └── auth.ts        # Authentication helpers
│   └── package.json
└── package.json               # Root scripts (delegates to frontend/)
```

**Key decisions:**

- **Next.js App Router** with separate `(public)` and `(dashboard)` route groups for layout isolation.
- **OmniRoute** acts as an OpenAI-compatible AI gateway. The server-side API route proxies all completions through OmniRoute, keeping credentials off the client.
- **Firebase Auth** handles user authentication for the dashboard.
- **Client-side guard** (`promptCheck.ts`) catches obvious attacks in-browser before the request is even sent; the server-side gateway provides a second layer.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- An **OmniRoute** endpoint (or any OpenAI-compatible API gateway)
- A **Firebase** project (for dashboard authentication)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd PromptShield
```

### 2. Configure environment variables

```bash
cp frontend/.env.example frontend/.env.local
```

Open `frontend/.env.local` and fill in your values:

```env
# OmniRoute AI gateway
OMNIROUTE_BASE_URL=http://localhost:20128/v1
OMNIROUTE_API_KEY=your_api_key_here
OMNIROUTE_MODEL=auto               # or a specific model id

# Firebase (public — safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

The app is now running at **http://localhost:3000**.

---

## 📜 Available Scripts

All scripts are run from the project root and delegate to the `frontend/` workspace.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server on `0.0.0.0:3000` |
| `npm run build` | Production build |
| `npm run start` | Start the production server on `0.0.0.0:3000` |
| `npm run lint` | Run ESLint |

---

## 🗺️ Pages & Routes

### Public (no login required)

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, threat demo, and capabilities |
| `/about` | About PromptShield |
| `/architecture` | System architecture overview |
| `/security` | Security model documentation |
| `/contact` | Contact page |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Dashboard (login required)

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview & KPIs |
| `/chat` | Secured chat with live threat detection |
| `/playground` | Prompt testing sandbox |
| `/incidents` | Incident log |
| `/analytics` | Usage & threat analytics |
| `/policies` | Security policy management |
| `/audit-logs` | Full audit trail |
| `/users` | User management |
| `/settings` | App settings |
| `/system` | System health & OmniRoute status |

---

## 🔌 API Reference

### `POST /api/ai`

Proxy a prompt through the OmniRoute gateway. Requires a valid Firebase Auth ID token in the `Authorization` header.

**Headers:**
```http
Authorization: Bearer <firebase_id_token>
```

**Request body:**

```json
{ "prompt": "Your message here" }
```

or

```json
{ "messages": [{ "role": "user", "content": "Your message here" }] }
```

**Success response (`200`):**

```json
{
  "provider": "OmniRoute",
  "model": "auto",
  "content": "The model's reply"
}
```

**Error response (`400` / `401` / `502`):**

```json
{
  "error": {
    "code": "INVALID_PROMPT | MISSING_API_KEY | UNAUTHORIZED | RATE_LIMITED | PROVIDER_UNAVAILABLE",
    "message": "Human-readable error"
  }
}
```

---

### `GET /api/health/omniroute`

Check OmniRoute connectivity and list available models.

**Response:**

```json
{
  "ok": true,
  "status": "available",
  "provider": "OmniRoute",
  "model": "auto",
  "message": "OmniRoute is available.",
  "availableModels": ["gpt-4o", "claude-3-5-sonnet"]
}
```

Possible `status` values: `available` · `unavailable` · `authentication_failure` · `rate_limited` · `model_unavailable` · `unconfigured`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui, Base UI, Radix |
| Animations | GSAP 3, Framer Motion 13, Lenis |
| 3D Graphics | Three.js |
| Charts | Recharts |
| Auth & DB | Firebase 12 |
| AI Gateway | OmniRoute (OpenAI-compatible) |

---

## 🔒 Security Model

1. **Client-side guard** (`promptCheck.ts`) — regex-based pattern matching catches obvious injection, jailbreak, and extraction attacks before the request leaves the browser.
2. **Server-side proxy** (`/api/ai`) — credentials never reach the client; the Next.js server owns the OmniRoute API key.
3. **Endpoint Security** — `/api/ai` strictly verifies Firebase ID tokens using the Firebase Admin SDK, including token revocation checking.
4. **Firebase Auth** — all dashboard routes are gated behind authenticated sessions with proper loading states.
5. **No raw API key exposure** — `OMNIROUTE_API_KEY` is a server-only env variable; Firebase keys are public-safe.

---

## 📄 License

This project is private. All rights reserved.