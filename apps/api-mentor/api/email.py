import asyncio
import logging
import os

import resend

logger = logging.getLogger(__name__)
resend.api_key = os.getenv("RESEND_API_KEY", "")
NEXTJS_URL = os.getenv("NEXTJS_URL", "http://localhost:3002")


async def send_feedback_email(
    parent_email: str,
    child_name: str,
    mentor_name: str,
    score: int,
    duration_secs: int,
    feedback_points: list[str],
) -> None:
    stars = "⭐" * (5 if score >= 90 else 4 if score >= 75 else 3 if score >= 60 else 2)
    duration_str = f"{duration_secs // 60} minutos"
    fp0 = feedback_points[0] if len(feedback_points) > 0 else ""
    fp1 = feedback_points[1] if len(feedback_points) > 1 else ""
    fp2 = feedback_points[2] if len(feedback_points) > 2 else ""

    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#1F3864">🌟 {child_name} tuvo una sesión con {mentor_name}</h2>
      <p style="color:#666">{stars} &middot; {duration_str}</p>
      <hr style="border:1px solid #eee;margin:16px 0">
      <h3 style="color:#1F3864">Reporte de la sesión:</h3>
      <p><strong>💪 Fortaleza:</strong> {fp0}</p>
      <p><strong>📈 A mejorar:</strong> {fp1}</p>
      <p><strong>🏠 Para practicar:</strong> {fp2}</p>
      <hr style="border:1px solid #eee;margin:16px 0">
      <a href="{NEXTJS_URL}/dashboard/padre/feedback"
         style="background:#1F3864;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">
        Ver historial completo
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px">NeuralPath — Aprende con IA 🇨🇴</p>
    </div>
    """

    for attempt in range(3):
        try:
            resend.Emails.send({
                "from": "NeuralPath <no-reply@neuralpath.co>",
                "to": parent_email,
                "subject": f"🌟 {child_name} practicó con {mentor_name}",
                "html": html,
            })
            logger.info(f"Feedback email sent to {parent_email}")
            return
        except Exception as e:
            if attempt == 2:
                logger.error(f"Email failed after 3 attempts: {e}")
            await asyncio.sleep(2)
