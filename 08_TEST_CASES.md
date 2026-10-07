# PromptShield — Test Cases

## 1. Functional Tests

| ID | Scenario | Expected |
|---|---|---|
| TC-001 | Benign question | ALLOW |
| TC-002 | Direct instruction override | Elevated risk / BLOCK or WARN according to policy |
| TC-003 | System prompt extraction | BLOCK when prompt-leak policy is enabled |
| TC-004 | Jailbreak attempt | Elevated risk |
| TC-005 | Suspicious encoded input | Obfuscation signal |
| TC-006 | Legitimate prompt containing security terminology | Should avoid unnecessary false positive |
| TC-007 | Sanitizable mixed-intent prompt | SANITIZE when safe |
| TC-008 | Provider unavailable | Clear provider error |
| TC-009 | Unauthorized admin request | 403 / denied |
| TC-010 | Audit event | Administrative action logged |

## 2. Security Tests

### Input Validation
- empty prompt,
- extremely long prompt,
- invalid JSON,
- unexpected fields,
- null values,
- Unicode/encoding edge cases.

### Authorization
- user accessing admin endpoint,
- analyst changing policy,
- unauthenticated event access,
- disabled user attempting login.

### Provider Safety
- blocked prompt must not call provider,
- sanitized prompt must be the only prompt sent after sanitization,
- provider API key must not appear in frontend payloads.

## 3. Detection Evaluation

Report:
- TP,
- TN,
- FP,
- FN,
- precision,
- recall,
- F1,
- false-positive rate,
- false-negative rate.

Always report the dataset, split, model version, and evaluation date.

## 4. Regression Tests

Every discovered bypass should become a permanent regression test.

Example:
```text
tests/regression/
├── direct_injection/
├── jailbreak/
├── prompt_leak/
├── obfuscation/
└── sensitive_extraction/
```
