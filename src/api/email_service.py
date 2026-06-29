import os
import smtplib
from email.message import EmailMessage


def _get_smtp_settings():
    return {
        "host": os.getenv("SMTP_HOST", "").strip(),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", "").strip(),
        "password": os.getenv("SMTP_PASSWORD", "").strip(),
        "from_email": os.getenv("SMTP_FROM_EMAIL", "").strip(),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").strip().lower() != "false",
    }


def send_reservation_confirmation_email(reservation):
    settings = _get_smtp_settings()

    if not settings["host"] or not settings["from_email"]:
        return False, "SMTP no configurado. Define SMTP_HOST y SMTP_FROM_EMAIL."

    recipient = (reservation.get("email") or "").strip()
    if not recipient:
        return False, "La reserva no incluye email de destino."

    salon_name = os.getenv("SALON_NAME", "Zen Massage")
    salon_phone = os.getenv("SALON_PHONE", "No disponible")
    salon_address = os.getenv("SALON_ADDRESS", "No disponible")

    msg = EmailMessage()
    msg["Subject"] = f"Confirmacion de reserva - {salon_name}"
    msg["From"] = settings["from_email"]
    msg["To"] = recipient

    body = (
        f"Hola {reservation.get('full_name', 'cliente')},\n\n"
        f"Tu reserva ha sido registrada correctamente en {salon_name}.\n\n"
        f"Detalle de la reserva:\n"
        f"- Servicio: {reservation.get('service', '-')}\n"
        f"- Fecha: {reservation.get('reservation_date', '-')}\n"
        f"- Hora: {reservation.get('reservation_time', '-')}\n"
        f"- Estado: {reservation.get('status', 'pendiente')}\n\n"
        f"Datos del salon:\n"
        f"- Telefono: {salon_phone}\n"
        f"- Direccion: {salon_address}\n\n"
        f"Gracias por elegir {salon_name}."
    )
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings["host"], settings["port"], timeout=15) as server:
            if settings["use_tls"]:
                server.starttls()
            if settings["user"] and settings["password"]:
                server.login(settings["user"], settings["password"])
            server.send_message(msg)
        return True, "Correo de confirmacion enviado."
    except Exception as error:
        return False, f"No se pudo enviar el correo: {error}"
