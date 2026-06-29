import React, { useEffect, useRef, useState } from "react";
import { resolveBackendUrl } from "../utils/backendUrl";

const initialFormData = {
    full_name: "",
    email: "",
    phone: "",
    reservation_date: "",
    reservation_time: "",
    service: "Masaje Relajante",
    message: ""
};

export const ReservationForm = () => {
    const [formData, setFormData] = useState(initialFormData);

    const [loading, setLoading] = useState(false);
    const [loadingTimes, setLoadingTimes] = useState(false);
    const [availableTimes, setAvailableTimes] = useState([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const successTimeoutRef = useRef(null);
    const backendUrl = resolveBackendUrl();

    useEffect(() => {
        return () => {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
            }
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    useEffect(() => {
        const fetchAvailableTimes = async () => {
            if (!formData.reservation_date) {
                setAvailableTimes([]);
                return;
            }

            setLoadingTimes(true);
            setErrorMessage("");

            try {
                const response = await fetch(
                    `${backendUrl}/api/reservations/available-times?date=${encodeURIComponent(formData.reservation_date)}`
                );
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "No se pudieron cargar las horas disponibles");
                }

                const times = data.available_times || [];
                setAvailableTimes(times);

                if (formData.reservation_time && !times.includes(formData.reservation_time)) {
                    setFormData(prev => ({ ...prev, reservation_time: "" }));
                }
            } catch (error) {
                setAvailableTimes([]);
                setErrorMessage(error.message || "Error al cargar disponibilidad");
            } finally {
                setLoadingTimes(false);
            }
        };

        fetchAvailableTimes();
    }, [formData.reservation_date]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar campos obligatorios
        if (!formData.full_name || !formData.email || !formData.reservation_date || !formData.reservation_time) {
            setErrorMessage("Por favor completa todos los campos obligatorios");
            return;
        }

        if (!availableTimes.includes(formData.reservation_time)) {
            setErrorMessage("La hora seleccionada no está disponible. Elige otra hora.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            setErrorMessage("Introduce un email válido.");
            return;
        }

        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        if (successTimeoutRef.current) {
            clearTimeout(successTimeoutRef.current);
        }

        try {
            const apiUrl = `${backendUrl}/api/reservations`;

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 409 && Array.isArray(data.available_times)) {
                    setAvailableTimes(data.available_times);
                    setFormData(prev => ({ ...prev, reservation_time: "" }));
                }
                setErrorMessage(data.error || "Error al crear la reserva");
                return;
            }

            setSuccessMessage("¡Reserva creada exitosamente! Nos contactaremos pronto.");
            setFormData(initialFormData);
            setAvailableTimes([]);
            successTimeoutRef.current = setTimeout(() => {
                setSuccessMessage("");
            }, 3000);

        } catch (error) {
            setErrorMessage("Error de conexión. Verifica que el servidor backend esté disponible e intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="reservation-section">
            <div className="container">
                <h2 className="reservation-title">Reserva tu cita</h2>
                <p className="reservation-subtitle">Completa el formulario y nos contactaremos para confirmar tu reserva</p>

                <form className="reservation-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Nombre completo *</label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                placeholder="Tu nombre"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="tu@email.com"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Teléfono</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="555-1234"
                            />
                        </div>
                        <div className="form-group">
                            <label>Tipo de masaje</label>
                            <select name="service" value={formData.service} onChange={handleChange}>
                                <option>Masaje Relajante</option>
                                <option>Masaje Deportivo</option>
                                <option>Piedras Calientes</option>
                                <option>Masaje Tailandés</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Fecha *</label>
                            <input
                                type="date"
                                name="reservation_date"
                                value={formData.reservation_date}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Hora *</label>
                            <select
                                name="reservation_time"
                                value={formData.reservation_time}
                                onChange={handleChange}
                                disabled={!formData.reservation_date || loadingTimes || availableTimes.length === 0}
                            >
                                <option value="">
                                    {!formData.reservation_date
                                        ? "Selecciona una fecha primero"
                                        : loadingTimes
                                            ? "Cargando horarios..."
                                            : availableTimes.length === 0
                                                ? "No hay horarios disponibles"
                                                : "Selecciona una hora"}
                                </option>
                                {availableTimes.map((time) => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group full-width">
                        <label>Mensaje (opcional)</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="Cuéntanos tus preferencias o necesidades especiales..."
                            rows="4"
                        ></textarea>
                    </div>

                    {successMessage && <div className="alert alert-success">{successMessage}</div>}
                    {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? "Enviando..." : "Confirmar reserva"}
                    </button>
                </form>
            </div>
        </section>
    );
};
