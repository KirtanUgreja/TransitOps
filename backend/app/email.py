"""Email via Resend. Fails soft: if unconfigured or Resend errors, we log and move on —
credentials are also returned in the API response, so email is a bonus channel, not a hard dep."""

import os

import resend

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
# Must be an address on a domain verified in Resend.
RESEND_FROM = os.environ.get("RESEND_FROM", "TransitOps <noreply@transportitops.orbisynth.biz>")
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def send_credentials_email(*, to: str, name: str, role_label: str, password: str) -> bool:
    """Email a newly-created user their login credentials. Returns True if sent."""
    if not RESEND_API_KEY:
        print("[email] RESEND_API_KEY not set — skipping credentials email")
        return False

    html = f"""
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#0f1729">
      <h2 style="margin:0 0 4px">Welcome to TransitOps</h2>
      <p style="color:#52606d;margin:0 0 20px">Your <strong>{role_label}</strong> account is ready.</p>
      <p>Hi {name}, an administrator created an account for you. Sign in with these credentials:</p>
      <table style="border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:6px 16px 6px 0;color:#52606d">Email</td>
            <td style="padding:6px 0;font-family:monospace">{to}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#52606d">Password</td>
            <td style="padding:6px 0;font-family:monospace">{password}</td></tr>
      </table>
      <a href="{APP_URL}/login" style="display:inline-block;background:#f59e0b;color:#241a04;
         text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600">Sign in</a>
      <p style="color:#8895a7;font-size:12px;margin-top:24px">
        Please change or keep this password safe. If you didn't expect this email, ignore it.</p>
    </div>
    """
    try:
        resend.Emails.send({
            "from": RESEND_FROM,
            "to": [to],
            "subject": "Your TransitOps account credentials",
            "html": html,
        })
        return True
    except Exception as e:  # noqa: BLE001 — never let email failure break user creation
        print(f"[email] failed to send credentials to {to}: {e}")
        return False
