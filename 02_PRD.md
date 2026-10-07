# PromptShield — Product Requirements Document (PRD)

## 1. Product Overview

PromptShield is a web-based AI security gateway designed to detect and prevent prompt injection attacks against Large Language Model applications.

It receives an untrusted prompt, analyzes it before it reaches the selected LLM, determines its security risk, optionally sanitizes it, applies guardrail policies, and then either allows, warns, sanitizes, or blocks the request.

## 2. Problem Statement

LLM-based enterprise applications can be manipulated by crafted inputs that attempt to bypass safety constraints, expose sensitive information, override higher-priority instructions, or trigger unintended behavior.

PromptShield addresses this by introducing a security layer that analyzes prompts before LLM execution and provides administrators with transparent security decisions and attack analytics.

## 3. Product Goals

### Primary Goals

- Detect prompt injection attempts in real time.
- Classify prompts as benign or malicious/suspicious.
- Identify the category of attack.
- Calculate an explainable risk score.
- Sanitize malicious input where legitimate intent can be preserved.
- Enforce runtime guardrail policies.
- Log security events.
- Provide an administrator dashboard.
- Support RBAC.
- Integrate with local and cloud LLM providers.

### Secondary Goals

- Make the detection engine independently testable.
- Make attack categories extensible.
- Provide a test playground for security researchers/developers.
- Support comparison of original and sanitized prompts.
- Provide analytics useful for continuous improvement.

## 4. Non-Goals

PromptShield will not:
- train a foundation LLM,
- guarantee detection of every attack,
- replace an LLM provider,
- act as a general chatbot,
- execute arbitrary tools without explicit policy controls,
- claim that an ML prediction is always correct.

## 5. Target Users

### Security Administrator
Needs:
- attack visibility,
- event logs,
- risk trends,
- policy controls,
- RBAC,
- model/rule configuration.

### AI/ML Developer
Needs:
- prompt testing,
- detection explanations,
- sanitized prompt comparison,
- model/provider selection,
- evaluation results.

### Application Developer
Needs:
- simple API integration,
- predictable allow/block responses,
- provider abstraction,
- security metadata.

### Researcher / Student
Needs:
- attack playground,
- sample attack categories,
- detection results,
- explainable scoring,
- evaluation metrics.

## 6. Core User Flow

1. User submits prompt.
2. Frontend sends prompt to PromptShield backend.
3. Backend validates request.
4. Prompt Analyzer normalizes the input.
5. Rule engine checks deterministic indicators.
6. ML detector evaluates the prompt.
7. Risk engine combines signals.
8. Guardrail engine checks active policies.
9. Decision engine returns:
   - ALLOW,
   - WARN,
   - SANITIZE,
   - BLOCK.
10. If allowed or sanitized, the backend may forward the resulting prompt to the selected LLM.
11. Security event is logged.
12. Dashboard updates analytics.

## 7. Functional Requirements

### FR-01 Prompt Analysis
The system shall analyze every prompt before forwarding it to an LLM.

### FR-02 Prompt Classification
The system shall classify prompts as benign, suspicious, or malicious.

### FR-03 Attack Categorization
The system shall identify one or more attack categories.

### FR-04 Risk Score
The system shall generate a risk score on a consistent scale, recommended 0–100.

Suggested interpretation:
- 0–24: Low
- 25–49: Moderate
- 50–74: High
- 75–100: Critical

These thresholds must be configurable.

### FR-05 Sanitization
The system shall attempt to rewrite malicious/suspicious content when legitimate intent can be preserved.

### FR-06 Guardrails
The system shall apply policy checks before LLM execution.

### FR-07 Decision
The system shall return an explicit security decision.

### FR-08 Logging
The system shall store security events with timestamp, decision, score, category, provider, and relevant metadata.

### FR-09 Dashboard
The system shall provide:
- total requests,
- blocked requests,
- warning requests,
- sanitized requests,
- attack distribution,
- attack trends,
- recent incidents,
- provider usage.

### FR-10 Admin Panel
Administrators shall be able to view and manage:
- users,
- roles,
- security policies,
- detection rules,
- thresholds,
- provider configuration metadata,
- audit logs.

### FR-11 RBAC
At minimum:
- Admin
- Analyst
- User

Permissions must be explicit.

### FR-12 LLM Providers
The system should support:
- Ollama
- OpenAI
- future provider adapters

Provider-specific code must remain isolated behind an adapter interface.

## 8. UI Requirements

### Dashboard
Display:
- security posture summary,
- request volume,
- risk distribution,
- attack categories,
- recent incidents,
- trend charts.

### Prompt Playground
Provide:
- prompt input,
- provider/model selection,
- Analyze button,
- risk score,
- decision,
- detected categories,
- explanations,
- sanitized prompt,
- LLM response where allowed.

### Incident Detail
Show:
- event ID,
- timestamp,
- user/session,
- original prompt with sensitive content masked where necessary,
- normalized prompt,
- detected signals,
- model result,
- risk score,
- final decision,
- sanitized prompt,
- provider/model,
- policy result.

### Admin
Provide:
- policy configuration,
- thresholds,
- rules,
- roles/users,
- audit logs,
- system status.

## 9. API-Level Product Contract

Main endpoint:

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

Response:
```json
{
  "requestId": "uuid",
  "decision": "ALLOW|WARN|SANITIZE|BLOCK",
  "riskScore": 0,
  "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
  "categories": [],
  "signals": [],
  "sanitizedPrompt": null,
  "llmResponse": null,
  "provider": "ollama",
  "model": "string",
  "latencyMs": 0
}
```

## 10. Acceptance Criteria

A release is acceptable when:

- A normal benign prompt reaches the selected LLM.
- A known direct injection example is detected.
- A jailbreak example produces an elevated risk.
- A prompt-leak attempt is detected.
- The user can see why a prompt was flagged.
- A blocked request is not sent to the LLM.
- A sanitized request uses the sanitized prompt.
- Security events appear in the dashboard.
- Admin-only routes reject unauthorized users.
- Provider failures are handled cleanly.
- The project can run locally using documented setup steps.

## 11. Success Metrics

Technical evaluation should report:
- precision,
- recall,
- F1-score,
- false-positive rate,
- false-negative rate,
- average detection latency,
- end-to-end latency,
- blocked/allowed/sanitized distribution.

Metrics must be measured against a documented evaluation dataset and not presented as universal guarantees.
