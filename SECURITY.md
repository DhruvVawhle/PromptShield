# Security Policy

## Supported Versions

PromptShield is currently in active development. Only the latest release on the `main` branch is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Security is a core focus for PromptShield. We take all vulnerabilities seriously.

If you discover a security vulnerability in PromptShield, please do **NOT** open a public issue. Instead, please report it privately:

1. Use the [GitHub Security Advisories](https://github.com/DhruvVawhle/PromptShield/security/advisories) feature to report a vulnerability privately.
2. Provide a clear description of the issue, including steps to reproduce, potential impact, and any suggested mitigations.

You should expect a response acknowledging receipt of the vulnerability within 48 hours.

## Best Practices

To ensure maximum security when running PromptShield locally or in production:
- Keep your Firebase Admin credentials secure and do not commit `.env.local` to version control.
- Ensure Upstash Redis rate-limiting variables are correctly configured to prevent abuse.
- Regularly audit your dependencies using `npm audit`.
