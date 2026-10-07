# PromptShield — UI/UX Specification

## 1. Product Feel

The UI should feel like an enterprise AI-security product.

Priorities:
1. Clarity
2. Security visibility
3. Fast scanning of incidents
4. Explainability
5. Low visual noise

## 2. Primary Navigation

- Dashboard
- Prompt Playground
- Incidents
- Analytics
- Policies
- Users
- Audit Logs
- System / Providers

Navigation visibility must depend on RBAC.

## 3. Dashboard

Top KPI cards:
- Total Requests
- Blocked
- Warned
- Sanitized
- Detection Rate / Evaluation Metric

Charts:
- Requests over time
- Risk distribution
- Attack category distribution
- Decision distribution

Recent incidents table:
- Time
- Severity
- Category
- Risk Score
- Decision
- Provider
- Status

## 4. Prompt Playground

Layout:

Left:
- Prompt editor
- Provider
- Model
- Execute toggle
- Analyze button

Right:
- Risk score
- Decision
- Risk level
- Categories
- Security explanation
- Sanitized prompt
- LLM response

Use clear visual hierarchy for BLOCK and CRITICAL states without relying only on color.

## 5. Incident Detail

Sections:
- Summary
- Security decision
- Risk score
- Attack categories
- Detection signals
- Prompt inspection
- Sanitization
- Provider/model
- Timeline
- Related events

## 6. Admin Policies

Policy cards should show:
- policy name,
- enabled/disabled,
- risk thresholds,
- blocked categories,
- sanitization enabled,
- last updated,
- updated by.

## 7. Responsive Behavior

Desktop-first because this is a security dashboard, but basic tablet responsiveness should be supported.

## 8. Accessibility

- Keyboard navigation
- Visible focus states
- Semantic labels
- Sufficient contrast
- Do not rely only on red/green to communicate security state
- Tables should remain readable at common laptop widths

## 9. UI State Requirements

Every data-driven screen must have:
- loading state,
- empty state,
- error state,
- success state.

Never show a blank page when an API fails.

## 10. Avoid

- fake hacker/terminal visuals,
- excessive neon styling,
- unnecessary 3D effects,
- unreadable charts,
- decorative animations,
- security decisions hidden behind icons only.
