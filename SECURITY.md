# Security Policy

## Reporting a vulnerability

Please report security issues **privately**, not through the public issue tracker.

Email **<your-contact-email@example.com>** with a description of the issue, steps to reproduce, and
the potential impact. You can expect an acknowledgement within a few days. Please give a reasonable
window to address the issue before any public disclosure.

## Handling your API key

This project is designed so your Anthropic API key stays on the server and is never sent to the
browser. To keep it that way:

- Keep your key in `.env` (which is git-ignored) or in your hosting platform's secret store. Never
  commit it, paste it into client-side code, or include it in screenshots or logs.
- If a key is ever exposed, **revoke it immediately** at
  <https://console.anthropic.com/settings/keys> and issue a new one.
- Before exposing a public instance, add rate limiting and abuse protection to `/api/enhance`. Each
  request spends real money on your key, so an open, unprotected endpoint can be abused to run up
  your bill.

## Supported versions

This is an early-stage project; only the latest version on the default branch is supported. Please
update before reporting issues.
