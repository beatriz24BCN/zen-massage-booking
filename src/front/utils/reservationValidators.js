const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedStatuses = ["pendiente", "confirmada", "cancelada", "completada"];

export const getAllowedStatuses = () => allowedStatuses;

export const validateReservationPayload = (payload) => {
  const errors = {};

  if (!payload.full_name?.trim()) errors.full_name = "El nombre es obligatorio";
  if (!payload.email?.trim()) {
    errors.email = "El email es obligatorio";
  } else if (!emailRegex.test(payload.email.trim())) {
    errors.email = "El email no tiene un formato válido";
  }

  if (!payload.service?.trim())
    errors.service = "El tipo de masaje es obligatorio";

  if (!payload.reservation_date?.trim()) {
    errors.reservation_date = "La fecha es obligatoria";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.reservation_date.trim())) {
    errors.reservation_date = "La fecha debe tener formato YYYY-MM-DD";
  }

  if (!payload.reservation_time?.trim()) {
    errors.reservation_time = "La hora es obligatoria";
  } else if (!/^\d{2}:\d{2}$/.test(payload.reservation_time.trim())) {
    errors.reservation_time = "La hora debe tener formato HH:MM";
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    errors.status = "El estado no es válido";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
