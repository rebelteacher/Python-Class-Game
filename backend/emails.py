"""ByteBattles admin email alerts.

Sends transactional emails via Resend to keep the admin (Amy) informed even
when she's not on the dashboard. Three flavours:
  1. Instant "new contact message" alert — only sent if she hasn't loaded the
     dashboard in the last ALERT_THROTTLE_HOURS hours (avoid inbox spam).
  2. Daily digest at 08:00 Central — unread messages + new teachers today +
     yesterday's traffic. Idempotent: never sends twice on the same date.
  3. Weekly summary each Monday at 08:00 Central — 7-day traffic + new teachers.

All emails are best-effort — a failure never breaks the parent request.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import resend

logger = logging.getLogger(__name__)

ALERT_THROTTLE_HOURS = 12  # instant alerts skipped if admin loaded dashboard within this window
_HTML_BASE_STYLE = "font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;"


def _config() -> Optional[dict]:
    """Return sender config or None if the integration isn't configured."""
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("ALERT_SENDER_EMAIL")
    recipient = os.environ.get("ALERT_RECIPIENT_EMAIL")
    if not api_key or not sender or not recipient:
        return None
    resend.api_key = api_key
    return {"sender": sender, "recipient": recipient}


async def _send(subject: str, html: str) -> bool:
    """Fire an email off-thread. Returns True on success."""
    cfg = _config()
    if cfg is None:
        logger.warning("Resend not configured — skipping email '%s'", subject)
        return False
    params = {
        "from": f"ByteBattles Alerts <{cfg['sender']}>",
        "to": [cfg["recipient"]],
        "subject": subject,
        "html": html,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("Sent email '%s' — id=%s", subject, (result or {}).get("id"))
        return True
    except Exception as exc:  # never crash caller
        logger.error("Resend send failed for '%s': %s", subject, exc)
        return False


# ── Templates ────────────────────────────────────────────────────────────────
def _wrap(title: str, body_html: str) -> str:
    return f"""
    <div style="{_HTML_BASE_STYLE} max-width:640px; margin:0 auto; padding:24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr><td style="padding-bottom:16px; border-bottom:2px solid #06b6d4;">
          <h1 style="margin:0; color:#0891b2; font-size:22px;">⚡ ByteBattles</h1>
          <p style="margin:4px 0 0; color:#64748b; font-size:14px;">{title}</p>
        </td></tr>
        <tr><td style="padding-top:16px;">{body_html}</td></tr>
        <tr><td style="padding-top:24px; border-top:1px solid #e2e8f0; color:#94a3b8; font-size:12px;">
          You're getting this because you're the admin of ByteBattles.
          Manage messages at <a href="https://byte-dashboard.emergent.host/admin/messages" style="color:#0891b2;">the dashboard</a>.
        </td></tr>
      </table>
    </div>
    """


def build_new_message_email(msg: dict) -> tuple[str, str]:
    name = msg.get("name") or msg.get("email") or "Anonymous"
    subject_line = msg.get("subject") or "(no subject)"
    body = (msg.get("message") or "").strip()
    if len(body) > 800:
        body = body[:800] + "…"
    html = _wrap(
        "📬 New contact message",
        f"""
        <p style="margin:0 0 12px; font-size:15px;"><strong>{name}</strong> just sent you a message on ByteBattles.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9; border-radius:6px; padding:16px;">
          <tr><td>
            <p style="margin:0 0 6px; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Subject</p>
            <p style="margin:0 0 12px; font-size:15px;"><strong>{subject_line}</strong></p>
            <p style="margin:0 0 6px; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Message</p>
            <p style="margin:0; font-size:14px; white-space:pre-wrap;">{body}</p>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;">
          <a href="https://byte-dashboard.emergent.host/admin/messages"
             style="display:inline-block; padding:10px 18px; background:#06b6d4; color:#ffffff; text-decoration:none; border-radius:4px; font-weight:600;">Open Messages →</a>
        </p>
        """,
    )
    return f"[ByteBattles] New message from {name}", html


def build_daily_digest_email(payload: dict) -> tuple[str, str]:
    unread = payload.get("unread_messages") or []
    unread_count = len(unread)
    new_teachers = payload.get("new_teachers_24h", 0)
    views_yday = payload.get("views_yesterday", 0)
    preview_views_yday = payload.get("preview_views_yesterday", 0)

    msg_html = ""
    if unread_count:
        rows = ""
        for m in unread[:8]:
            rows += f"""
            <tr><td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">
              <div style="font-size:14px;"><strong>{m.get('name') or m.get('email') or 'Anonymous'}</strong>
              <span style="color:#64748b;"> — {m.get('subject') or '(no subject)'}</span></div>
              <div style="font-size:13px; color:#475569; margin-top:2px;">{(m.get('message') or '')[:180]}</div>
            </td></tr>
            """
        msg_html = f"""
        <h3 style="margin:24px 0 8px; color:#0891b2;">📬 Unread messages ({unread_count})</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>
        """
    else:
        msg_html = '<p style="margin:24px 0 8px; color:#64748b;">📭 No unread contact messages.</p>'

    html = _wrap(
        "☀️ Daily digest",
        f"""
        <p style="margin:0 0 16px; font-size:15px;">Here's what happened on ByteBattles yesterday.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9; border-radius:6px;">
          <tr>
            <td style="padding:16px; width:33%; text-align:center; border-right:1px solid #e2e8f0;">
              <div style="font-size:24px; color:#0891b2; font-weight:700;">{unread_count}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Unread msgs</div>
            </td>
            <td style="padding:16px; width:33%; text-align:center; border-right:1px solid #e2e8f0;">
              <div style="font-size:24px; color:#059669; font-weight:700;">{new_teachers}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">New teachers</div>
            </td>
            <td style="padding:16px; width:33%; text-align:center;">
              <div style="font-size:24px; color:#7c3aed; font-weight:700;">{views_yday}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Views (24h)</div>
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0; color:#64748b; font-size:13px;">
          Of those {views_yday} views, <strong style="color:#a3e635;">{preview_views_yday}</strong> were on the free curriculum preview.
        </p>
        {msg_html}
        <p style="margin:24px 0 0;">
          <a href="https://byte-dashboard.emergent.host/teacher/dashboard"
             style="display:inline-block; padding:10px 18px; background:#06b6d4; color:#ffffff; text-decoration:none; border-radius:4px; font-weight:600;">Open Dashboard →</a>
        </p>
        """,
    )
    return f"[ByteBattles] Daily digest — {unread_count} unread, {new_teachers} new teachers", html


def build_weekly_summary_email(payload: dict) -> tuple[str, str]:
    views_7d = payload.get("views_7d", 0)
    unique_7d = payload.get("unique_7d", 0)
    new_teachers_7d = payload.get("new_teachers_7d", 0)
    preview_views_7d = payload.get("preview_views_7d", 0)
    top_pages = payload.get("top_pages", [])[:5]

    rows = ""
    for p in top_pages:
        rows += f"""
        <tr>
          <td style="padding:6px 0; font-size:13px; color:#475569;">{p.get('path', '')[:60]}</td>
          <td style="padding:6px 0; font-size:13px; color:#0891b2; text-align:right; font-weight:600;">{p.get('views', 0)}</td>
        </tr>
        """
    top_html = f"""
      <h3 style="margin:24px 0 8px; color:#0891b2;">🔥 Top pages this week</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>
    """ if rows else ""

    html = _wrap(
        "📊 Weekly summary",
        f"""
        <p style="margin:0 0 16px; font-size:15px;">Traffic snapshot for the last 7 days.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9; border-radius:6px;">
          <tr>
            <td style="padding:16px; text-align:center; border-right:1px solid #e2e8f0;">
              <div style="font-size:24px; color:#7c3aed; font-weight:700;">{views_7d}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Views</div>
            </td>
            <td style="padding:16px; text-align:center; border-right:1px solid #e2e8f0;">
              <div style="font-size:24px; color:#0891b2; font-weight:700;">{unique_7d}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Unique</div>
            </td>
            <td style="padding:16px; text-align:center; border-right:1px solid #e2e8f0;">
              <div style="font-size:24px; color:#059669; font-weight:700;">{new_teachers_7d}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">New Teachers</div>
            </td>
            <td style="padding:16px; text-align:center;">
              <div style="font-size:24px; color:#a3e635; font-weight:700;">{preview_views_7d}</div>
              <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Preview Views</div>
            </td>
          </tr>
        </table>
        {top_html}
        <p style="margin:24px 0 0;">
          <a href="https://byte-dashboard.emergent.host/admin/analytics"
             style="display:inline-block; padding:10px 18px; background:#06b6d4; color:#ffffff; text-decoration:none; border-radius:4px; font-weight:600;">Full Analytics →</a>
        </p>
        """,
    )
    return f"[ByteBattles] Weekly summary — {views_7d} views · {new_teachers_7d} new teachers", html


# ── Public API ───────────────────────────────────────────────────────────────
async def send_new_message_alert(msg: dict) -> None:
    subject, html = build_new_message_email(msg)
    await _send(subject, html)


async def send_daily_digest(payload: dict) -> None:
    subject, html = build_daily_digest_email(payload)
    await _send(subject, html)


async def send_weekly_summary(payload: dict) -> None:
    subject, html = build_weekly_summary_email(payload)
    await _send(subject, html)


def hours_since(dt_val: Any) -> float:
    """Return hours since dt_val (datetime or ISO string). Infinity if None."""
    if dt_val is None:
        return float("inf")
    if isinstance(dt_val, str):
        try:
            dt_val = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
        except ValueError:
            return float("inf")
    if dt_val.tzinfo is None:
        dt_val = dt_val.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - dt_val
    return delta.total_seconds() / 3600.0
