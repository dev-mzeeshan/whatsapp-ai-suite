import logging
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmailService:
    """
    Gmail SMTP email service — completely free.
    Setup: Gmail → Google Account → Security → 2FA ON → App Passwords → Generate
    .env mein add karo:
        GMAIL_USER=tumhara@gmail.com
        GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  (16 char app password)
    """

    def __init__(self) -> None:
      # Har baar fresh settings load karo — cached nahi
      from app.config import get_settings
      _settings = get_settings()
      self.gmail_user = getattr(_settings, "GMAIL_USER", "") or ""
      self.gmail_password = getattr(_settings, "GMAIL_APP_PASSWORD", "") or ""
      self.from_name = _settings.APP_NAME

    async def send_password_reset(self, to_email: str, reset_link: str, user_name: str) -> bool:
        """
        Password reset email bhejo.
        Returns True agar sent, False agar failed.
        """
        if not self.gmail_user or not self.gmail_password:
            logger.warning("Gmail credentials not set — skipping email")
            # Development mein link log mein print karo
            print(f"\n🔗 PASSWORD RESET LINK: {reset_link}\n")
            logger.info("PASSWORD RESET LINK (dev mode): %s", reset_link)
            return True  # Dev mein true return karo

        subject = f"Password Reset — {self.from_name}"
        html = self._reset_email_html(user_name, reset_link)

        return await self._send(to_email, subject, html)

    async def send_welcome(self, to_email: str, business_name: str, password: str) -> bool:
        """
        Naya client banane par welcome email bhejo.
        """
        if not self.gmail_user or not self.gmail_password:
            logger.info("WELCOME EMAIL (dev mode): to=%s business=%s", to_email, business_name)
            return True

        subject = f"Welcome to {self.from_name} — Your Dashboard is Ready!"
        html = self._welcome_email_html(business_name, to_email, password)
        return await self._send(to_email, subject, html)

    async def _send(self, to_email: str, subject: str, html: str) -> bool:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.gmail_user}>"
            msg["To"] = to_email
            msg.attach(MIMEText(html, "html"))

            context = ssl.create_default_context()
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
                server.login(self.gmail_user, self.gmail_password)
                server.sendmail(self.gmail_user, to_email, msg.as_string())

            logger.info("Email sent | to=%s | subject=%s", to_email, subject)
            return True

        except Exception as e:
            logger.error("Email send failed | to=%s | error=%s", to_email, e)
            return False

    def _reset_email_html(self, name: str, link: str) -> str:
        return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#111b21;border-radius:16px;overflow:hidden;border:1px solid #2a3942">
    <div style="background:#00a884;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">{settings.APP_NAME}</h1>
    </div>
    <div style="padding:32px 24px">
      <h2 style="color:white;margin:0 0 8px">Hi {name} 👋</h2>
      <p style="color:#8696a0;margin:0 0 24px">
        We received a request to reset your password. Click the button below to set a new password.
      </p>
      <a href="{link}" style="display:block;background:#00a884;color:white;text-decoration:none;padding:14px 24px;border-radius:10px;text-align:center;font-weight:600;font-size:15px">
        Reset Password
      </a>
      <p style="color:#8696a0;font-size:12px;margin:16px 0 0;text-align:center">
        Link expires in 1 hour. If you didn't request this, ignore this email.
      </p>
    </div>
  </div>
</body>
</html>"""

    def _welcome_email_html(self, business: str, email: str, password: str) -> str:
        # frontend_url = getattr(settings, "FRONTEND_URL", "https://whatsapp-ai-suite-hazel.vercel.app")
        frontend_url = settings.FRONTEND_URL
        return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#111b21;border-radius:16px;overflow:hidden;border:1px solid #2a3942">
    <div style="background:#00a884;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">{settings.APP_NAME}</h1>
    </div>
    <div style="padding:32px 24px">
      <h2 style="color:white;margin:0 0 8px">Welcome, {business}! 🎉</h2>
      <p style="color:#8696a0;margin:0 0 24px">Your WhatsApp dashboard is ready. Here are your login credentials:</p>
      <div style="background:#1f2c33;border-radius:10px;padding:16px;margin-bottom:24px">
        <p style="color:#8696a0;margin:0 0 4px;font-size:12px">Email</p>
        <p style="color:white;margin:0 0 12px;font-weight:600">{email}</p>
        <p style="color:#8696a0;margin:0 0 4px;font-size:12px">Password</p>
        <p style="color:white;margin:0;font-weight:600;font-family:monospace">{password}</p>
      </div>
      <a href="{frontend_url}/login" style="display:block;background:#00a884;color:white;text-decoration:none;padding:14px 24px;border-radius:10px;text-align:center;font-weight:600;font-size:15px">
        Login to Dashboard
      </a>
      <p style="color:#8696a0;font-size:12px;margin:16px 0 0;text-align:center">
        Please change your password after first login.
      </p>
    </div>
  </div>
</body>
</html>"""


# Singleton
email_service = EmailService()