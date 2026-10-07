# PromptShield — Master Project Context

## 1. Project Identity

**Project Name:** PromptShield  
**Project Type:** Personal portfolio / security engineering project  
**Primary Domain:** AI Security, Generative AI Security, NLP, Machine Learning, Cybersecurity  
**Core Problem:** Detect, explain, sanitize, and prevent prompt-injection-style attacks before untrusted prompts reach an LLM.

PromptShield is a **security layer around LLM applications**. It is not itself an LLM and should not be presented as a replacement for ChatGPT, Gemini, or Ollama. The normal flow is:

User/Application → PromptShield → Security Analysis → Allow / Warn / Block / Sanitize → LLM Provider

Supported LLM targets can include OpenAI, Gemini, and local Ollama models.

## 2. Source of Requirements

The original college abstract is the primary source for the project's problem statement, objectives, expected outcomes, and baseline technology requirements.

Source title: `Major Project Abstract Updated.pdf`

The source defines the project as **PromptShield – Detection and Prevention of Prompt Injection Attacks in Large Language Models** and identifies AI, ML, NLP, Generative AI/LLMs, and Cybersecurity as the selected domains.

## 3. What PromptShield Must Demonstrate

The application should demonstrate these capabilities:

1. Prompt analysis before LLM execution.
2. Detection of malicious or suspicious prompt behavior.
3. Attack categorization.
4. Explainable risk scoring.
5. Prompt sanitization.
6. Runtime guardrails.
7. Allow / warn / block decisions.
8. Attack/event logging.
9. Real-time analytics.
10. Admin controls.
11. Role-Based Access Control (RBAC).
12. Integration with local and/or API-based LLMs.

## 4. Important Conceptual Boundary

PromptShield is a **security gateway**.

It must NOT be designed as:
- a general-purpose chatbot,
- an autonomous agent that performs arbitrary user actions,
- a replacement for the underlying LLM,
- a system that claims perfect detection,
- a system that blindly trusts an ML classifier.

The security decision should be based on multiple signals where practical:
- deterministic rules,
- pattern analysis,
- ML/transformer classification,
- risk scoring,
- policy/guardrail checks.

## 5. Core Attack Categories

The first implementation should support:

- Direct prompt injection
- Indirect prompt injection
- Jailbreak attempts
- System-prompt extraction / prompt leakage
- Role or instruction hierarchy manipulation
- Sensitive-information extraction attempts
- Tool/action manipulation
- Obfuscated or encoded malicious instructions
- Context poisoning
- Suspicious instruction chaining

The taxonomy must remain extensible.

## 6. Security Decision Model

Every prompt should end with a machine-readable security decision:

- `ALLOW`
- `WARN`
- `SANITIZE`
- `BLOCK`

The UI should show the reason, risk score, detected categories, and relevant evidence.

## 7. Design Principle

A legitimate user should still be able to use the connected LLM normally.

PromptShield should preserve legitimate intent whenever sanitization is possible, rather than simply rejecting every prompt containing suspicious words.

## 8. Source vs Implementation Decisions

### Source-locked requirements
The uploaded abstract explicitly specifies:
- React.js frontend
- Node.js + Express.js backend
- MongoDB database
- Python 3.x with Hugging Face Transformers and LangChain
- Ollama local inference and/or OpenAI API
- Docker
- Git/GitHub
- VS Code
- Windows 10/11 or Ubuntu
- 8 GB minimum RAM
- Optional GPU

### Personal-project implementation direction
Prior project planning established a layered architecture:
- Web UI
- Node backend/API gateway
- Python security/ML service
- MongoDB
- LLM provider adapters
- Dockerized services

Do not mix responsibilities between these layers.

If an implementation detail is not specified, choose a reasonable engineering default and document it rather than silently changing the product requirements.

## 9. Non-Functional Requirements

### Security
- Never expose provider API keys to the browser.
- Sanitize and validate all API inputs.
- Use RBAC for administrative functions.
- Avoid storing secrets in logs.
- Avoid logging raw sensitive prompts by default.
- Provide configurable retention.
- Use secure password/session handling if local authentication is implemented.

### Explainability
Each security decision should be understandable to an administrator:
- score,
- decision,
- categories,
- triggered rules,
- model confidence where applicable,
- sanitized output if generated.

### Reliability
- LLM provider failures must not crash the security service.
- If a provider is unavailable, the UI must show a clear provider error.
- Detection should be independently testable from LLM execution.

### Maintainability
- Type-safe API contracts where practical.
- Modular detection rules.
- Modular LLM adapters.
- Unit tests for security rules.
- Integration tests for the complete request pipeline.

## 10. Product Positioning

PromptShield should look and behave like a serious **AI security control plane**, not a college demo.

Visual language:
- modern security dashboard,
- clean enterprise UI,
- clear severity indicators,
- dark or neutral security-oriented interface,
- charts for attack trends,
- detailed prompt inspection,
- audit-log presentation.

Avoid excessive animations, gimmicks, fake terminal effects, and decorative UI that does not improve security analysis.
