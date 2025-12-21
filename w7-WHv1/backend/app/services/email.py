"""Email service for sending expiry alerts and notifications in Hungarian."""

import logging
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings
from app.schemas.expiry import ExpiryWarning, ExpiryWarningSummary

logger = logging.getLogger(__name__)


def _format_date_hu(d: date) -> str:
    """Format date in Hungarian style (yyyy. MM. dd.)."""
    return f"{d.year}. {d.month:02d}. {d.day:02d}."


def _build_expiry_alert_html(
    warnings: list[ExpiryWarning],
    summary: ExpiryWarningSummary,
) -> str:
    """Build HTML email body for expiry alerts in Hungarian."""
    # Group warnings by urgency
    critical_items = [w for w in warnings if w.urgency == "critical"]
    high_items = [w for w in warnings if w.urgency == "high"]

    html = f"""
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lejárat Figyelmeztetés</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background-color: #dc3545;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }}
        .summary {{
            background-color: #f8f9fa;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #dc3545;
        }}
        .summary-item {{
            display: inline-block;
            margin-right: 20px;
        }}
        .critical {{
            color: #dc3545;
            font-weight: bold;
        }}
        .high {{
            color: #fd7e14;
            font-weight: bold;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background-color: #343a40;
            color: white;
        }}
        tr:nth-child(even) {{
            background-color: #f8f9fa;
        }}
        tr.critical-row {{
            background-color: #f8d7da;
        }}
        tr.high-row {{
            background-color: #fff3cd;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Lejárat Figyelmeztetés</h1>
        <p>WMS - Raktárkezelő Rendszer</p>
    </div>

    <div class="summary">
        <h3>Összefoglaló</h3>
        <span class="summary-item"><strong class="critical">Kritikus:</strong> {summary.critical} db</span>
        <span class="summary-item"><strong class="high">Magas:</strong> {summary.high} db</span>
        <span class="summary-item"><strong>Összes figyelmeztetés:</strong> {summary.total} db</span>
    </div>
"""

    if critical_items:
        html += """
    <h2 class="critical">KRITIKUS - Azonnali beavatkozás szükséges!</h2>
    <p>Az alábbi termékek 7 napon belül lejárnak:</p>
    <table>
        <thead>
            <tr>
                <th>Termék</th>
                <th>SKU</th>
                <th>Batch</th>
                <th>Tárolóhely</th>
                <th>Raktár</th>
                <th>Mennyiség</th>
                <th>Lejárat</th>
                <th>Hátralévő napok</th>
            </tr>
        </thead>
        <tbody>
"""
        for item in critical_items:
            html += f"""
            <tr class="critical-row">
                <td>{item.product_name}</td>
                <td>{item.sku or "-"}</td>
                <td>{item.batch_number}</td>
                <td>{item.bin_code}</td>
                <td>{item.warehouse_name}</td>
                <td>{item.quantity} {item.unit}</td>
                <td>{_format_date_hu(item.use_by_date)}</td>
                <td><strong>{item.days_until_expiry} nap</strong></td>
            </tr>
"""
        html += """
        </tbody>
    </table>
"""

    if high_items:
        html += """
    <h2 class="high">MAGAS PRIORITÁS - Figyelem szükséges</h2>
    <p>Az alábbi termékek 14 napon belül lejárnak:</p>
    <table>
        <thead>
            <tr>
                <th>Termék</th>
                <th>SKU</th>
                <th>Batch</th>
                <th>Tárolóhely</th>
                <th>Raktár</th>
                <th>Mennyiség</th>
                <th>Lejárat</th>
                <th>Hátralévő napok</th>
            </tr>
        </thead>
        <tbody>
"""
        for item in high_items:
            html += f"""
            <tr class="high-row">
                <td>{item.product_name}</td>
                <td>{item.sku or "-"}</td>
                <td>{item.batch_number}</td>
                <td>{item.bin_code}</td>
                <td>{item.warehouse_name}</td>
                <td>{item.quantity} {item.unit}</td>
                <td>{_format_date_hu(item.use_by_date)}</td>
                <td>{item.days_until_expiry} nap</td>
            </tr>
"""
        html += """
        </tbody>
    </table>
"""

    html += f"""
    <div class="footer">
        <p>Ez egy automatikus értesítés a WMS Raktárkezelő Rendszerből.</p>
        <p>Kérjük, vegye fel a kapcsolatot a raktár vezetőjével a szükséges intézkedések megtételéhez.</p>
        <p>Generálva: {_format_date_hu(date.today())}</p>
    </div>
</body>
</html>
"""
    return html


def _build_expiry_alert_text(
    warnings: list[ExpiryWarning],
    summary: ExpiryWarningSummary,
) -> str:
    """Build plain text email body for expiry alerts in Hungarian."""
    critical_items = [w for w in warnings if w.urgency == "critical"]
    high_items = [w for w in warnings if w.urgency == "high"]

    text = f"""
LEJÁRAT FIGYELMEZTETÉS
======================
WMS - Raktárkezelő Rendszer

ÖSSZEFOGLALÓ
------------
Kritikus: {summary.critical} db
Magas: {summary.high} db
Összes figyelmeztetés: {summary.total} db

"""

    if critical_items:
        text += """
KRITIKUS - AZONNALI BEAVATKOZÁS SZÜKSÉGES!
==========================================
Az alábbi termékek 7 napon belül lejárnak:

"""
        for item in critical_items:
            text += f"""
- {item.product_name} ({item.sku or "-"})
  Batch: {item.batch_number}
  Hely: {item.bin_code} ({item.warehouse_name})
  Mennyiség: {item.quantity} {item.unit}
  Lejárat: {_format_date_hu(item.use_by_date)} ({item.days_until_expiry} nap)
"""

    if high_items:
        text += """

MAGAS PRIORITÁS - FIGYELEM SZÜKSÉGES
====================================
Az alábbi termékek 14 napon belül lejárnak:

"""
        for item in high_items:
            text += f"""
- {item.product_name} ({item.sku or "-"})
  Batch: {item.batch_number}
  Hely: {item.bin_code} ({item.warehouse_name})
  Mennyiség: {item.quantity} {item.unit}
  Lejárat: {_format_date_hu(item.use_by_date)} ({item.days_until_expiry} nap)
"""

    text += f"""

---
Ez egy automatikus értesítés a WMS Raktárkezelő Rendszerből.
Generálva: {_format_date_hu(date.today())}
"""
    return text


async def send_expiry_alert_email(
    recipients: list[str],
    warnings: list[ExpiryWarning],
    summary: ExpiryWarningSummary,
) -> None:
    """
    Send expiry alert email to recipients.

    Args:
        recipients: List of email addresses.
        warnings: List of expiry warnings.
        summary: Warning summary counts.

    Raises:
        Exception: If email sending fails.
    """
    if not recipients:
        logger.warning("No recipients configured for expiry alerts")
        return

    # Build email
    msg = MIMEMultipart("alternative")
    msg["Subject"] = (
        f"[WMS] Lejárat Figyelmeztetés - {summary.critical} kritikus, {summary.high} magas"
    )
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = ", ".join(recipients)

    # Add plain text and HTML parts
    text_content = _build_expiry_alert_text(warnings, summary)
    html_content = _build_expiry_alert_html(warnings, summary)

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        # Send email
        if settings.SMTP_TLS:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER if settings.SMTP_USER else None,
                password=settings.SMTP_PASSWORD if settings.SMTP_PASSWORD else None,
                start_tls=True,
            )
        else:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER if settings.SMTP_USER else None,
                password=settings.SMTP_PASSWORD if settings.SMTP_PASSWORD else None,
            )

        logger.info(f"Expiry alert email sent to {len(recipients)} recipients")

    except Exception as e:
        logger.error(f"Failed to send expiry alert email: {e}")
        raise


async def send_test_email(recipient: str) -> bool:
    """
    Send a test email to verify SMTP configuration.

    Args:
        recipient: Email address to send test to.

    Returns:
        bool: True if successful, False otherwise.
    """
    msg = MIMEMultipart()
    msg["Subject"] = "[WMS] Teszt Email - SMTP Konfiguráció"
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = recipient

    text = """
Ez egy teszt email a WMS Raktárkezelő Rendszerből.

Ha megkapta ezt az emailt, az SMTP konfiguráció megfelelően működik.

---
WMS - Raktárkezelő Rendszer
"""
    msg.attach(MIMEText(text, "plain", "utf-8"))

    try:
        if settings.SMTP_TLS:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER if settings.SMTP_USER else None,
                password=settings.SMTP_PASSWORD if settings.SMTP_PASSWORD else None,
                start_tls=True,
            )
        else:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER if settings.SMTP_USER else None,
                password=settings.SMTP_PASSWORD if settings.SMTP_PASSWORD else None,
            )
        logger.info(f"Test email sent to {recipient}")
        return True
    except Exception as e:
        logger.error(f"Failed to send test email: {e}")
        return False
