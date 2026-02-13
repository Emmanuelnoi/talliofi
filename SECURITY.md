# Security Hardening Notes

This project is a browser-first personal finance application with optional
Supabase cloud sync.

## Auth Rate Limiting (Server-Side)

Client-side login throttling exists for UX, but it is not a security boundary.
Enforce server-side auth rate limits in production:

1. Supabase Dashboard -> Authentication -> Rate Limits:
   - Email/password sign-in attempts
   - OTP / MFA verification attempts
   - Signup and recovery endpoints
2. Add WAF / edge throttling in front of the app (per-IP burst limits).
3. Alert on repeated `invalid_credentials` / MFA failures.

Recommended baseline:

- Per-IP: `10 requests / minute` for auth endpoints.
- Per-account (email): `5 failed attempts / 15 minutes`.
- MFA verification: `5 attempts / 5 minutes`.

Deployment guardrails in this codebase:

- Production cloud auth is blocked unless both env flags are `true`:
  - `VITE_SECURITY_AUTH_RATE_LIMITS_CONFIGURED`
  - `VITE_SECURITY_EDGE_RATE_LIMITS_CONFIGURED`

## Browser Threat Model

Accepted assumptions:

- Data can be exposed if the browser runtime is compromised (XSS, malicious
  extensions, rooted host, shared profile).
- Local encryption protects data at rest, not against active script execution
  in an unlocked session.

Controls in this codebase:

- Encryption passphrases are not stored in app state.
- A non-extractable `CryptoKey` is kept in memory while vault is unlocked.
- CSP is enabled and hardened (`object-src 'none'`, `frame-ancestors 'none'`).
- Supabase session persistence is disabled by default (`VITE_SUPABASE_PERSIST_SESSION=false`).
- CSP discipline is test-enforced (no inline scripts; no `unsafe-inline` for
  `script-src`).
- Browser hardening acknowledgement is tracked in Settings on-device.

Recommended operational controls:

- Use dedicated browser profiles.
- Disable untrusted extensions on financial-device profiles.
- Enable full-disk encryption and OS account lock.
