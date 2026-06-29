"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from datetime import datetime, timedelta
import re
from flask import request, jsonify, Blueprint, current_app
from api.models import db, User, Reservation
from api.email_service import send_reservation_confirmation_email
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt, get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

api = Blueprint('api', __name__)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ALLOWED_STATUSES = {"pendiente", "confirmada", "cancelada", "completada"}
BUSINESS_START_HOUR = 9
BUSINESS_END_HOUR = 19
SLOT_INTERVAL_MINUTES = 30


def _is_admin_claim(jwt_payload):
    return bool(jwt_payload.get("is_admin"))


def _admin_forbidden_response():
    return jsonify({"error": "No autorizado. Se requiere administrador."}), 403


def _unauthorized_response():
    return jsonify({"error": "Credenciales inválidas"}), 401


def _build_admin_claims(user):
    return {"is_admin": True, "email": user.email}


def _generate_time_slots():
    slots = []
    start = datetime(2000, 1, 1, BUSINESS_START_HOUR, 0)
    end = datetime(2000, 1, 1, BUSINESS_END_HOUR, 0)
    while start < end:
        slots.append(start.strftime('%H:%M'))
        start += timedelta(minutes=SLOT_INTERVAL_MINUTES)
    return slots


AVAILABLE_TIME_SLOTS = _generate_time_slots()


def _is_valid_date(date_str):
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False


def get_occupied_slots_for_date(reservation_date, exclude_reservation_id=None):
    query = Reservation.query.filter(
        Reservation.reservation_date == reservation_date,
        Reservation.status != 'cancelada'
    )

    if exclude_reservation_id is not None:
        query = query.filter(Reservation.id != exclude_reservation_id)

    reservations = query.all()
    return {reservation.reservation_time for reservation in reservations}


def is_slot_available(reservation_date, reservation_time, exclude_reservation_id=None):
    if reservation_time not in AVAILABLE_TIME_SLOTS:
        return False
    occupied_slots = get_occupied_slots_for_date(
        reservation_date, exclude_reservation_id)
    return reservation_time not in occupied_slots


def validate_reservation_payload(data):
    required_fields = ['full_name', 'email', 'service',
                       'reservation_date', 'reservation_time']
    missing_fields = [
        field for field in required_fields if not str(data.get(field, '')).strip()]

    if missing_fields:
        return None, {
            "error": "Campos obligatorios faltantes",
            "missing_fields": missing_fields
        }

    cleaned = {
        "full_name": str(data.get('full_name', '')).strip(),
        "email": str(data.get('email', '')).strip(),
        "phone": (str(data.get('phone', '')).strip() or None),
        "service": str(data.get('service', '')).strip(),
        "reservation_date": str(data.get('reservation_date', '')).strip(),
        "reservation_time": str(data.get('reservation_time', '')).strip(),
        "status": str(data.get('status', 'pendiente')).strip().lower(),
        "message": (str(data.get('message', '')).strip() or None),
    }

    if not EMAIL_REGEX.match(cleaned['email']):
        return None, {"error": "Email inválido"}

    try:
        datetime.strptime(cleaned['reservation_date'], '%Y-%m-%d')
    except ValueError:
        return None, {"error": "Fecha inválida. Usa formato YYYY-MM-DD"}

    try:
        datetime.strptime(cleaned['reservation_time'], '%H:%M')
    except ValueError:
        return None, {"error": "Hora inválida. Usa formato HH:MM"}

    if cleaned['status'] not in ALLOWED_STATUSES:
        return None, {
            "error": "Estado inválido",
            "allowed_statuses": sorted(ALLOWED_STATUSES)
        }

    return cleaned, None


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200


@api.route('/admin/login', methods=['POST'])
def admin_login():
    """Login de administrador con JWT"""

    if not request.is_json:
        return jsonify({"error": "Content-Type debe ser application/json"}), 400

    data = request.get_json() or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', '')).strip()

    if not email or not password:
        return jsonify({"error": "Email y contraseña son obligatorios"}), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Email inválido"}), 400

    user = User.query.filter(User.email.ilike(email)).first()
    if not user:
        return _unauthorized_response()

    password_ok = user.check_password(password)
    if not password_ok and user.password == password:
        # Migracion transparente de contraseñas legacy en texto plano.
        try:
            user.set_password(password)
            db.session.commit()
            password_ok = True
        except Exception:
            db.session.rollback()
            return jsonify({"error": "No se pudo validar la cuenta. Inténtalo nuevamente."}), 500

    if not password_ok:
        return _unauthorized_response()

    if not user.is_active:
        return _admin_forbidden_response()

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=_build_admin_claims(user)
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims=_build_admin_claims(user)
    )

    return jsonify({
        "success": True,
        "token": access_token,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "is_admin": True,
        }
    }), 200


@api.route('/admin/refresh', methods=['POST'])
@jwt_required(refresh=True)
def admin_refresh():
    jwt_payload = get_jwt()
    if not _is_admin_claim(jwt_payload):
        return _admin_forbidden_response()

    identity = get_jwt_identity()
    user = User.query.get(int(identity)) if identity and str(
        identity).isdigit() else None
    if not user or not user.is_active:
        return jsonify({"error": "No autorizado. Usuario inválido o inactivo."}), 401

    new_access_token = create_access_token(
        identity=str(user.id),
        additional_claims=_build_admin_claims(user)
    )

    return jsonify({
        "success": True,
        "access_token": new_access_token
    }), 200


@api.route('/admin/me', methods=['GET'])
@jwt_required()
def admin_me():
    jwt_payload = get_jwt()
    if not _is_admin_claim(jwt_payload):
        return _admin_forbidden_response()

    return jsonify({
        "success": True,
        "admin": {
            "id": get_jwt_identity(),
            "email": jwt_payload.get("email"),
            "is_admin": True,
        }
    }), 200


@api.route('/reservations/available-times', methods=['GET'])
def get_available_times():
    reservation_date = str(request.args.get('date', '')).strip()
    if not reservation_date:
        return jsonify({"error": "Debes enviar el parametro date (YYYY-MM-DD)"}), 400

    if not _is_valid_date(reservation_date):
        return jsonify({"error": "Fecha inválida. Usa formato YYYY-MM-DD"}), 400

    occupied_slots = get_occupied_slots_for_date(reservation_date)
    available_slots = [
        slot for slot in AVAILABLE_TIME_SLOTS if slot not in occupied_slots]

    return jsonify({
        "success": True,
        "date": reservation_date,
        "available_times": available_slots,
        "occupied_times": sorted(list(occupied_slots)),
    }), 200


@api.route('/reservations', methods=['GET'])
@jwt_required()
def list_reservations():
    """Listar todas las reservas"""

    if not _is_admin_claim(get_jwt()):
        return _admin_forbidden_response()

    reservations = Reservation.query.order_by(
        Reservation.created_at.desc()).all()
    return jsonify({
        "success": True,
        "reservations": [reservation.serialize() for reservation in reservations]
    }), 200


@api.route('/reservations/<int:id>', methods=['GET'])
@jwt_required()
def get_reservation(id):
    """Obtener una reserva por id"""

    if not _is_admin_claim(get_jwt()):
        return _admin_forbidden_response()

    reservation = Reservation.query.get(id)
    if not reservation:
        return jsonify({
            "error": "Reserva no encontrada",
            "id": id
        }), 404

    return jsonify({
        "success": True,
        "reservation": reservation.serialize()
    }), 200


@api.route('/reservations', methods=['POST', 'OPTIONS'])
def create_reservation():
    """Crear una nueva reserva"""

    if request.method == 'OPTIONS':
        return jsonify({"ok": True}), 200

    # Validar que los datos lleguen en JSON
    if not request.is_json:
        return jsonify({"error": "Content-Type debe ser application/json"}), 400

    data = request.get_json() or {}
    cleaned_data, validation_error = validate_reservation_payload(data)
    if validation_error:
        return jsonify(validation_error), 400

    reservation_date = cleaned_data['reservation_date']
    reservation_time = cleaned_data['reservation_time']

    if reservation_time not in AVAILABLE_TIME_SLOTS:
        return jsonify({
            "error": "Hora no válida para reservas",
            "available_times": AVAILABLE_TIME_SLOTS
        }), 400

    if not is_slot_available(reservation_date, reservation_time):
        return jsonify({
            "error": "Ese horario ya no está disponible. Elige otra hora.",
            "available_times": [slot for slot in AVAILABLE_TIME_SLOTS if slot not in get_occupied_slots_for_date(reservation_date)]
        }), 409

    try:
        # Crear la reserva
        new_reservation = Reservation(
            full_name=cleaned_data['full_name'],
            email=cleaned_data['email'],
            phone=cleaned_data['phone'],
            service=cleaned_data['service'],
            reservation_date=cleaned_data['reservation_date'],
            reservation_time=cleaned_data['reservation_time'],
            status=cleaned_data['status'],
            message=cleaned_data['message']
        )

        db.session.add(new_reservation)
        db.session.commit()

        email_sent, email_message = send_reservation_confirmation_email(
            new_reservation.serialize())

        return jsonify({
            "success": True,
            "message": "Reserva creada exitosamente",
            "reservation": new_reservation.serialize(),
            "email_sent": email_sent,
            "email_message": email_message
        }), 201

    except IntegrityError:
        db.session.rollback()
        current_app.logger.warning(
            "Conflicto de concurrencia al crear reserva para %s %s",
            reservation_date,
            reservation_time,
            exc_info=True
        )
        return jsonify({
            "error": "Ese horario ya no está disponible. Elige otra hora.",
            "available_times": [
                slot for slot in AVAILABLE_TIME_SLOTS
                if slot not in get_occupied_slots_for_date(reservation_date)
            ]
        }), 409
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Error interno al crear una reserva")
        return jsonify({
            "error": "Error interno del servidor. Inténtalo nuevamente más tarde."
        }), 500


@api.route('/reservations/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_reservation(id):
    """Eliminar una reserva por su id"""

    if not _is_admin_claim(get_jwt()):
        return _admin_forbidden_response()

    try:
        # Buscar la reserva por id
        reservation = Reservation.query.get(id)

        # Validar que exista
        if not reservation:
            return jsonify({
                "error": "Reserva no encontrada",
                "id": id
            }), 404

        # Eliminar la reserva
        db.session.delete(reservation)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Reserva eliminada exitosamente",
            "id": id
        }), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Error interno al eliminar una reserva")
        return jsonify({
            "error": "Error interno del servidor. Inténtalo nuevamente más tarde."
        }), 500


@api.route('/reservations/<int:id>', methods=['PUT'])
@jwt_required()
def update_reservation(id):
    """Actualizar una reserva por id"""

    if not _is_admin_claim(get_jwt()):
        return _admin_forbidden_response()

    if not request.is_json:
        return jsonify({"error": "Content-Type debe ser application/json"}), 400

    reservation = Reservation.query.get(id)
    if not reservation:
        return jsonify({
            "error": "Reserva no encontrada",
            "id": id
        }), 404

    data = request.get_json() or {}
    cleaned_data, validation_error = validate_reservation_payload(data)
    if validation_error:
        return jsonify(validation_error), 400

    if not is_slot_available(cleaned_data['reservation_date'], cleaned_data['reservation_time'], exclude_reservation_id=id):
        return jsonify({
            "error": "La hora seleccionada ya no está disponible",
            "available_times": [
                slot for slot in AVAILABLE_TIME_SLOTS
                if slot not in get_occupied_slots_for_date(cleaned_data['reservation_date'], exclude_reservation_id=id)
            ]
        }), 409

    try:
        reservation.full_name = cleaned_data['full_name']
        reservation.email = cleaned_data['email']
        reservation.phone = cleaned_data['phone']
        reservation.service = cleaned_data['service']
        reservation.reservation_date = cleaned_data['reservation_date']
        reservation.reservation_time = cleaned_data['reservation_time']
        reservation.status = cleaned_data['status']
        reservation.message = cleaned_data['message']

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Reserva actualizada exitosamente",
            "reservation": reservation.serialize()
        }), 200
    except IntegrityError:
        db.session.rollback()
        current_app.logger.warning(
            "Conflicto de concurrencia al actualizar reserva %s a %s %s",
            id,
            cleaned_data['reservation_date'],
            cleaned_data['reservation_time'],
            exc_info=True
        )
        return jsonify({
            "error": "La hora seleccionada ya no está disponible",
            "available_times": [
                slot for slot in AVAILABLE_TIME_SLOTS
                if slot not in get_occupied_slots_for_date(cleaned_data['reservation_date'], exclude_reservation_id=id)
            ]
        }), 409
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Error interno al actualizar una reserva")
        return jsonify({
            "error": "Error interno del servidor. Inténtalo nuevamente más tarde."
        }), 500
