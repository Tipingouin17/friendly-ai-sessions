"""
Email service for AIfacilitator platform.
Uses Resend (https://resend.com) for transactional emails.
Provides beautiful HTML email templates for:
  - Welcome / signup confirmation
  - Password reset
  - Email address verification

NOTE: All env vars (RESEND_API_KEY, EMAIL_FROM, etc.) are read at *call time*
inside send_email() — not at module import time — so that Railway env var
updates take effect without requiring a full redeploy.
"""
import os
import resend
from datetime import datetime

# ── Helpers to read config at call time ───────────────────────────────────────
def _api_key() -> str:
    return os.environ.get("RESEND_API_KEY", "")

def _from_email() -> str:
    return os.environ.get("EMAIL_FROM", "noreply@aifacilitator.ai")

def _from_name() -> str:
    return os.environ.get("EMAIL_FROM_NAME", "AIfacilitator")

def _site_url() -> str:
    return os.environ.get("SITE_URL", "https://aifacilitator.ai")


# ── Base template ─────────────────────────────────────────────────────────────
def _base_template(preheader: str, body_html: str) -> str:
    year = datetime.utcnow().year
    site_url = _site_url()
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>AIfacilitator</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ background-color: #F0F4FF; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }}
    .wrapper {{ background-color: #F0F4FF; padding: 40px 20px; }}
    .container {{ max-width: 560px; margin: 0 auto; }}
    .header {{ text-align: center; padding-bottom: 28px; }}
    .logo-mark {{ display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }}
    .logo-icon {{ width: 40px; height: 40px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 10px; display: inline-block; }}
    .logo-text {{ font-size: 20px; font-weight: 700; color: #1E1B4B; letter-spacing: -0.5px; }}
    .card {{ background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(79, 70, 229, 0.08); }}
    .card-banner {{ height: 6px; background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 50%, #06B6D4 100%); }}
    .card-body {{ padding: 40px 40px 32px; }}
    h1 {{ font-size: 24px; font-weight: 700; color: #1E1B4B; line-height: 1.3; margin-bottom: 12px; }}
    p {{ font-size: 15px; color: #4B5563; line-height: 1.7; margin-bottom: 16px; }}
    .highlight {{ color: #4F46E5; font-weight: 600; }}
    .btn-wrap {{ text-align: center; margin: 28px 0; }}
    .btn {{ display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #FFFFFF !important; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 50px; letter-spacing: 0.2px; box-shadow: 0 4px 16px rgba(79, 70, 229, 0.35); }}
    .divider {{ height: 1px; background: #E5E7EB; margin: 24px 0; }}
    .small {{ font-size: 13px; color: #9CA3AF; line-height: 1.6; }}
    .link {{ color: #4F46E5; text-decoration: none; word-break: break-all; }}
    .footer {{ text-align: center; padding-top: 24px; }}
    .footer p {{ font-size: 12px; color: #9CA3AF; }}
    .footer a {{ color: #6B7280; text-decoration: none; }}
    .feature-row {{ display: flex; gap: 16px; margin: 20px 0; }}
    .feature-item {{ flex: 1; background: #F5F3FF; border-radius: 12px; padding: 16px; text-align: center; }}
    .feature-icon {{ font-size: 22px; margin-bottom: 6px; }}
    .feature-label {{ font-size: 12px; font-weight: 600; color: #4F46E5; }}
  </style>
</head>
<body>
  <span style="display:none;max-height:0;overflow:hidden;">{preheader}</span>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="{site_url}" class="logo-mark">
          <span class="logo-icon"></span>
          <span class="logo-text">AIfacilitator</span>
        </a>
      </div>
      <div class="card">
        <div class="card-banner"></div>
        <div class="card-body">
          {body_html}
        </div>
      </div>
      <div class="footer">
        <p>© {year} AIfacilitator. All rights reserved.</p>
        <p style="margin-top:6px;"><a href="{site_url}/privacy">Privacy Policy</a> &nbsp;·&nbsp; <a href="{site_url}/terms">Terms of Service</a></p>
      </div>
    </div>
  </div>
</body>
</html>"""


# ── Welcome email ─────────────────────────────────────────────────────────────
def build_welcome_email(full_name: str, login_url: str) -> tuple[str, str]:
    """Returns (subject, html_body)."""
    first = full_name.split()[0] if full_name else "there"
    subject = "Welcome to AIfacilitator 🎉"
    body = f"""
      <h1>Welcome aboard, {first}! 👋</h1>
      <p>Your account has been created successfully. You're now part of a growing community of facilitators using AI to run more engaging, insightful workshops.</p>

      <div class="feature-row">
        <div class="feature-item">
          <div class="feature-icon">🤖</div>
          <div class="feature-label">AI-Powered</div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📊</div>
          <div class="feature-label">Rich Reports</div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">⚡</div>
          <div class="feature-label">Real-Time</div>
        </div>
      </div>

      <p>Ready to run your first session? Click below to get started:</p>

      <div class="btn-wrap">
        <a href="{login_url}" class="btn">Get Started →</a>
      </div>

      <div class="divider"></div>
      <p class="small">If you didn't create this account, you can safely ignore this email. No action is required.</p>
    """
    return subject, _base_template(f"Welcome to AIfacilitator, {first}! Your account is ready.", body)


# ── Email verification ────────────────────────────────────────────────────────
def build_verification_email(full_name: str, verify_url: str) -> tuple[str, str]:
    """Returns (subject, html_body) for the email verification message."""
    first = full_name.split()[0] if full_name else "there"
    subject = "Verify your AIfacilitator email address"
    body = f"""
      <h1>Almost there, {first}! ✉️</h1>
      <p>Thanks for signing up for AIfacilitator. To activate your account and start running AI-powered sessions, please verify your email address by clicking the button below:</p>

      <div class="btn-wrap">
        <a href="{verify_url}" class="btn">Verify Email Address →</a>
      </div>

      <div class="divider"></div>

      <p class="small">⏱ <strong>This link expires in 24 hours.</strong></p>
      <p class="small">If you didn't create an AIfacilitator account, you can safely ignore this email.</p>
      <p class="small" style="margin-top:12px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p class="small"><a href="{verify_url}" class="link">{verify_url}</a></p>
    """
    return subject, _base_template(
        f"Verify your email to activate your AIfacilitator account, {first}.",
        body,
    )


# ── Password reset email ──────────────────────────────────────────────────────
def build_password_reset_email(full_name: str, reset_url: str) -> tuple[str, str]:
    """Returns (subject, html_body)."""
    first = full_name.split()[0] if full_name else "there"
    subject = "Reset your AIfacilitator password"
    body = f"""
      <h1>Reset your password</h1>
      <p>Hi {first},</p>
      <p>We received a request to reset the password for your AIfacilitator account. Click the button below to choose a new password:</p>

      <div class="btn-wrap">
        <a href="{reset_url}" class="btn">Reset Password →</a>
      </div>

      <div class="divider"></div>

      <p class="small">⏱ <strong>This link expires in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
      <p class="small" style="margin-top:12px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p class="small"><a href="{reset_url}" class="link">{reset_url}</a></p>
    """
    return subject, _base_template("Reset your AIfacilitator password — link expires in 1 hour.", body)


# ── Send helper ───────────────────────────────────────────────────────────────
def send_email(to_email: str, subject: str, html: str) -> bool:
    """Send an email via Resend. Returns True on success, False on failure.

    Env vars are read at call time (not module import time) so that Railway
    env var updates are picked up without a full redeploy.
    """
    api_key = _api_key()
    from_addr = f"{_from_name()} <{_from_email()}>"

    if not api_key:
        print(f"[email] WARNING: RESEND_API_KEY not set — skipping email to {to_email}")
        return False

    print(f"[email] Sending '{subject}' to {to_email} via {from_addr} (key prefix: {api_key[:8]}...)")
    try:
        resend.api_key = api_key
        params: resend.Emails.SendParams = {
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        result = resend.Emails.send(params)
        email_id = result.get("id", "?") if isinstance(result, dict) else getattr(result, "id", "?")
        print(f"[email] SUCCESS: '{subject}' sent to {to_email} — Resend id: {email_id}")
        return True
    except Exception as e:
        print(f"[email] ERROR sending '{subject}' to {to_email}: {e}")
        return False


def send_welcome_email(to_email: str, full_name: str) -> bool:
    login_url = f"{_site_url()}/login"
    subject, html = build_welcome_email(full_name, login_url)
    return send_email(to_email, subject, html)


def send_verification_email(to_email: str, full_name: str, token: str) -> bool:
    verify_url = f"{_site_url()}/verify-email?token={token}"
    subject, html = build_verification_email(full_name, verify_url)
    return send_email(to_email, subject, html)


def send_password_reset_email(to_email: str, full_name: str, token: str) -> bool:
    reset_url = f"{_site_url()}/reset-password?token={token}"
    subject, html = build_password_reset_email(full_name, reset_url)
    return send_email(to_email, subject, html)
