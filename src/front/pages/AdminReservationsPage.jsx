import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resolveBackendUrl } from "../utils/backendUrl";
import {
    getAllowedStatuses,
    validateReservationPayload
} from "../utils/reservationValidators";
import { authFetch, clearAdminSession } from "../utils/adminAuth";

const services = [
    "Masaje Relajante",
    "Masaje Deportivo",
    "Piedras Calientes",
    "Masaje Tailandés"
];

const weekDayLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const getDateKey = (date) => date.toISOString().slice(0, 10);

const getReservationDateTime = (reservation) =>
    new Date(`${reservation.reservation_date}T${reservation.reservation_time}:00`);

const buildMonthGrid = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const days = [];
    for (let index = 0; index < startOffset; index += 1) {
        days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        days.push(day);
    }
    return days;
};

const buildEditState = (reservation) => ({
    full_name: reservation.full_name || "",
    email: reservation.email || "",
    phone: reservation.phone || "",
    service: reservation.service || "Masaje Relajante",
    reservation_date: reservation.reservation_date || "",
    reservation_time: reservation.reservation_time || "",
    status: reservation.status || "pendiente",
    message: reservation.message || ""
});

export const AdminReservationsPage = () => {
    const [reservations, setReservations] = useState([]);
    const [viewMode, setViewMode] = useState("table");
    const [filterDate, setFilterDate] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState("date_desc");
    const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [editingReservationId, setEditingReservationId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    const backendUrl = useMemo(() => resolveBackendUrl(), []);
    const activeDateFilter = selectedCalendarDate || filterDate;
    const filteredReservations = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filtered = reservations.filter((reservation) => {
            const matchesDate = !activeDateFilter || reservation.reservation_date === activeDateFilter;
            const reservationStatus = (reservation.status || "pendiente").toLowerCase();
            const matchesStatus = !filterStatus || reservationStatus === filterStatus;
            const searchable = [reservation.full_name, reservation.phone, reservation.service]
                .map((value) => (value || "").toString().toLowerCase())
                .join(" ");
            const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);

            return matchesDate && matchesStatus && matchesSearch;
        });

        const sorted = [...filtered].sort((a, b) => {
            const dateA = getReservationDateTime(a).getTime();
            const dateB = getReservationDateTime(b).getTime();
            return sortOrder === "date_asc" ? dateA - dateB : dateB - dateA;
        });

        return sorted;
    }, [reservations, activeDateFilter, filterStatus, searchTerm, sortOrder]);

    const reservationCountByDate = useMemo(() => {
        const counter = {};
        reservations.forEach((reservation) => {
            const dateKey = reservation.reservation_date;
            counter[dateKey] = (counter[dateKey] || 0) + 1;
        });
        return counter;
    }, [reservations]);

    const calendarDays = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);

    const calendarSelectedDayReservations = useMemo(() => {
        if (!selectedCalendarDate) return [];
        return reservations
            .filter((reservation) => reservation.reservation_date === selectedCalendarDate)
            .sort((a, b) => getReservationDateTime(a).getTime() - getReservationDateTime(b).getTime());
    }, [reservations, selectedCalendarDate]);

    const calendarTitle = useMemo(
        () => calendarMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
        [calendarMonth]
    );
    const dashboardStats = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        const stats = {
            total: reservations.length,
            pendiente: 0,
            confirmada: 0,
            cancelada: 0,
            hoy: 0
        };

        reservations.forEach((reservation) => {
            const status = (reservation.status || "pendiente").toLowerCase();
            if (status === "pendiente") stats.pendiente += 1;
            if (status === "confirmada") stats.confirmada += 1;
            if (status === "cancelada") stats.cancelada += 1;
            if (reservation.reservation_date === today) stats.hoy += 1;
        });

        return stats;
    }, [reservations]);

    const statusBreakdown = useMemo(() => {
        const total = dashboardStats.total || 1;
        return [
            {
                key: "pendiente",
                label: "Pendientes",
                count: dashboardStats.pendiente,
                percentage: Math.round((dashboardStats.pendiente / total) * 100)
            },
            {
                key: "confirmada",
                label: "Confirmadas",
                count: dashboardStats.confirmada,
                percentage: Math.round((dashboardStats.confirmada / total) * 100)
            },
            {
                key: "cancelada",
                label: "Canceladas",
                count: dashboardStats.cancelada,
                percentage: Math.round((dashboardStats.cancelada / total) * 100)
            }
        ];
    }, [dashboardStats]);

    const weeklyActivity = useMemo(() => {
        const dates = [];
        const now = new Date();
        for (let i = 6; i >= 0; i -= 1) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const key = getDateKey(date);
            dates.push({
                key,
                shortLabel: date.toLocaleDateString("es-ES", { weekday: "short" }),
                count: reservationCountByDate[key] || 0
            });
        }

        const max = Math.max(...dates.map((item) => item.count), 1);
        return {
            points: dates,
            max
        };
    }, [reservationCountByDate]);

    const handleUnauthorized = (message = "Tu sesión expiró. Inicia sesión nuevamente.") => {
        clearAdminSession();
        navigate("/admin/login", { replace: true, state: { from: "/admin/reservations" } });
        setErrorMessage(message);
    };

    const updateReservationStatus = async (reservation, status) => {
        if ((reservation.status || "pendiente") === status) {
            return;
        }

        setActionLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const payload = {
                ...buildEditState(reservation),
                status
            };

            const response = await authFetch(backendUrl, `/api/reservations/${reservation.id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            if (response.status === 401 || response.status === 422 || response.status === 403) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "No se pudo actualizar el estado");
            }

            setSuccessMessage(`Reserva marcada como ${status}.`);
            await fetchReservations();
        } catch (error) {
            setErrorMessage(error.message || "Error al actualizar estado");
        } finally {
            setActionLoading(false);
        }
    };

    const fetchReservations = async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const response = await authFetch(backendUrl, "/api/reservations", {
                method: "GET"
            });

            if (response.status === 401 || response.status === 422 || response.status === 403) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudieron cargar las reservas");
            }

            setReservations(data.reservations || []);
        } catch (error) {
            setErrorMessage(error.message || "Error al cargar reservas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, []);

    const startEdit = (reservation) => {
        setEditingReservationId(reservation.id);
        setEditForm(buildEditState(reservation));
        setFormErrors({});
        setErrorMessage("");
        setSuccessMessage("");
    };

    const cancelEdit = () => {
        setEditingReservationId(null);
        setEditForm(null);
        setFormErrors({});
    };

    const handleEditChange = (event) => {
        const { name, value } = event.target;
        setEditForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const saveEdit = async (id) => {
        const validation = validateReservationPayload(editForm || {});
        if (!validation.isValid) {
            setFormErrors(validation.errors);
            return;
        }

        setActionLoading(true);
        setFormErrors({});
        setErrorMessage("");

        try {
            const response = await authFetch(backendUrl, `/api/reservations/${id}`, {
                method: "PUT",
                body: JSON.stringify(editForm)
            });

            if (response.status === 401 || response.status === 422 || response.status === 403) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudo actualizar la reserva");
            }

            setSuccessMessage("Reserva actualizada correctamente.");
            setEditingReservationId(null);
            setEditForm(null);
            await fetchReservations();
        } catch (error) {
            setErrorMessage(error.message || "Error al actualizar reserva");
        } finally {
            setActionLoading(false);
        }
    };

    const deleteReservation = async (reservation) => {
        const confirmed = window.confirm(
            `¿Seguro que quieres eliminar la reserva de ${reservation.full_name}?`
        );

        if (!confirmed) return;

        setActionLoading(true);
        setErrorMessage("");

        try {
            const response = await authFetch(backendUrl, `/api/reservations/${reservation.id}`, {
                method: "DELETE"
            });

            if (response.status === 401 || response.status === 422 || response.status === 403) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "No se pudo eliminar la reserva");
            }

            setSuccessMessage("Reserva eliminada correctamente.");
            if (selectedReservation?.id === reservation.id) {
                setSelectedReservation(null);
            }
            await fetchReservations();
        } catch (error) {
            setErrorMessage(error.message || "Error al eliminar reserva");
        } finally {
            setActionLoading(false);
        }
    };

    const seeDetails = async (reservationId) => {
        setActionLoading(true);
        setErrorMessage("");

        try {
            const response = await authFetch(backendUrl, `/api/reservations/${reservationId}`, {
                method: "GET"
            });

            if (response.status === 401 || response.status === 422 || response.status === 403) {
                handleUnauthorized();
                return;
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "No se pudieron obtener los detalles");
            }

            setSelectedReservation(data.reservation);
        } catch (error) {
            setErrorMessage(error.message || "Error al obtener detalles");
        } finally {
            setActionLoading(false);
        }
    };

    const resetFilters = () => {
        setFilterDate("");
        setFilterStatus("");
        setSearchTerm("");
        setSelectedCalendarDate("");
    };

    const changeMonth = (offset) => {
        setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const selectCalendarDay = (day) => {
        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
        const dateKey = getDateKey(date);
        setSelectedCalendarDate(dateKey);
        setFilterDate("");
    };

    return (
        <section className="reservation-section">
            <div className="container" style={{ paddingTop: "130px", paddingBottom: "40px" }}>
                <h2 className="reservation-title">Panel de Reservas</h2>
                <p className="reservation-subtitle">Gestiona reservas sin cambiar el diseño principal del sitio.</p>

                {successMessage && <div className="alert alert-success">{successMessage}</div>}
                {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

                <div className="admin-dashboard mb-4">
                    <div className="row g-3 mb-3">
                        <div className="col-12 col-md-6 col-xl-3">
                            <article className="admin-stat-card admin-stat-card-total">
                                <p className="admin-stat-label">Total de reservas</p>
                                <p className="admin-stat-value">{dashboardStats.total}</p>
                                <p className="admin-stat-caption">Base general del panel</p>
                            </article>
                        </div>
                        <div className="col-12 col-md-6 col-xl-3">
                            <article className="admin-stat-card admin-stat-card-today">
                                <p className="admin-stat-label">Reservas de hoy</p>
                                <p className="admin-stat-value">{dashboardStats.hoy}</p>
                                <p className="admin-stat-caption">Agenda del día actual</p>
                            </article>
                        </div>
                        <div className="col-12 col-md-6 col-xl-2">
                            <article className="admin-stat-card admin-stat-card-pending">
                                <p className="admin-stat-label">Pendientes</p>
                                <p className="admin-stat-value">{dashboardStats.pendiente}</p>
                                <p className="admin-stat-caption">Sin gestionar</p>
                            </article>
                        </div>
                        <div className="col-12 col-md-6 col-xl-2">
                            <article className="admin-stat-card admin-stat-card-confirmed">
                                <p className="admin-stat-label">Confirmadas</p>
                                <p className="admin-stat-value">{dashboardStats.confirmada}</p>
                                <p className="admin-stat-caption">Listas para atención</p>
                            </article>
                        </div>
                        <div className="col-12 col-md-6 col-xl-2">
                            <article className="admin-stat-card admin-stat-card-canceled">
                                <p className="admin-stat-label">Canceladas</p>
                                <p className="admin-stat-value">{dashboardStats.cancelada}</p>
                                <p className="admin-stat-caption">No activas</p>
                            </article>
                        </div>
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-lg-8">
                            <article className="admin-insight-card h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Distribución por estado</h5>
                                    <span className="text-muted small">Indicador visual</span>
                                </div>
                                <div className="admin-status-track mb-3" role="img" aria-label="Distribución de reservas por estado">
                                    {statusBreakdown.map((item) => (
                                        <span
                                            key={item.key}
                                            className={`admin-status-segment admin-status-segment-${item.key}`}
                                            style={{ width: `${item.percentage}%` }}
                                            title={`${item.label}: ${item.count}`}
                                        />
                                    ))}
                                </div>

                                <div className="row g-2">
                                    {statusBreakdown.map((item) => (
                                        <div key={`legend-${item.key}`} className="col-12 col-md-4">
                                            <div className="admin-legend-item">
                                                <span className={`admin-legend-dot admin-legend-dot-${item.key}`} />
                                                <span className="admin-legend-label">{item.label}</span>
                                                <strong>{item.count}</strong>
                                                <span className="text-muted">({item.percentage}%)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        </div>

                        <div className="col-12 col-lg-4">
                            <article className="admin-insight-card h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Últimos 7 días</h5>
                                    <span className="text-muted small">Actividad</span>
                                </div>
                                <div className="admin-mini-chart" role="img" aria-label="Actividad semanal de reservas">
                                    {weeklyActivity.points.map((point) => (
                                        <div key={point.key} className="admin-mini-chart-col">
                                            <div
                                                className="admin-mini-chart-bar"
                                                style={{ height: `${Math.max((point.count / weeklyActivity.max) * 100, 6)}%` }}
                                                title={`${point.count} reservas`}
                                            />
                                            <span className="admin-mini-chart-value">{point.count}</span>
                                            <span className="admin-mini-chart-label">{point.shortLabel}</span>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        </div>
                    </div>

                    <div className="mt-3">
                        <button
                            type="button"
                            className="btn btn-outline-dark"
                            onClick={() => {
                                clearAdminSession();
                                navigate("/admin/login", { replace: true });
                            }}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded p-3 shadow-sm mb-3">
                    <div className="d-flex flex-wrap gap-2 mb-3">
                        <button
                            type="button"
                            className={`btn ${viewMode === "table" ? "btn-dark" : "btn-outline-dark"}`}
                            onClick={() => setViewMode("table")}
                        >
                            Vista tabla
                        </button>
                        <button
                            type="button"
                            className={`btn ${viewMode === "calendar" ? "btn-dark" : "btn-outline-dark"}`}
                            onClick={() => setViewMode("calendar")}
                        >
                            Vista calendario
                        </button>
                    </div>

                    <div className="row g-3 align-items-end">
                        <div className="col-lg-3 col-md-6">
                            <label className="form-label">Filtrar por fecha</label>
                            <input
                                type="date"
                                className="form-control"
                                value={filterDate}
                                onChange={(event) => {
                                    setFilterDate(event.target.value);
                                    setSelectedCalendarDate("");
                                }}
                            />
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <label className="form-label">Filtrar por estado</label>
                            <select
                                className="form-select"
                                value={filterStatus}
                                onChange={(event) => setFilterStatus(event.target.value)}
                            >
                                <option value="">Todos</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="confirmada">Confirmada</option>
                                <option value="cancelada">Cancelada</option>
                                <option value="completada">Completada</option>
                            </select>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <label className="form-label">Buscar</label>
                            <input
                                type="text"
                                className="form-control"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Nombre, teléfono o masaje"
                            />
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <label className="form-label">Orden</label>
                            <select
                                className="form-select"
                                value={sortOrder}
                                onChange={(event) => setSortOrder(event.target.value)}
                            >
                                <option value="date_desc">Fecha y hora (más recientes)</option>
                                <option value="date_asc">Fecha y hora (más antiguas)</option>
                            </select>
                        </div>
                        <div className="col-md-12 d-flex">
                            <button
                                type="button"
                                className="btn btn-outline-secondary w-100"
                                onClick={resetFilters}
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">
                        Mostrando {filteredReservations.length} de {reservations.length} reservas
                    </small>
                    {activeDateFilter && (
                        <small className="text-muted">Fecha activa: {activeDateFilter}</small>
                    )}
                </div>

                {viewMode === "calendar" && (
                    <div className="bg-white rounded p-3 shadow-sm mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => changeMonth(-1)}>
                                Mes anterior
                            </button>
                            <h5 className="mb-0 text-capitalize">{calendarTitle}</h5>
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => changeMonth(1)}>
                                Mes siguiente
                            </button>
                        </div>

                        <div className="mb-2" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.5rem" }}>
                            {weekDayLabels.map((label) => (
                                <div key={label} className="text-center text-muted small fw-semibold">{label}</div>
                            ))}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "0.5rem" }}>
                            {calendarDays.map((day, index) => {
                                if (!day) {
                                    return <div key={`empty-${index}`}><div style={{ minHeight: "70px" }} /></div>;
                                }

                                const dateKey = getDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
                                const count = reservationCountByDate[dateKey] || 0;
                                const selected = selectedCalendarDate === dateKey;

                                return (
                                    <div key={dateKey}>
                                        <button
                                            type="button"
                                            className={`btn w-100 text-start ${selected ? "btn-dark" : "btn-outline-secondary"}`}
                                            style={{ minHeight: "70px" }}
                                            onClick={() => selectCalendarDay(day)}
                                        >
                                            <div className="fw-semibold">{day}</div>
                                            <small>{count} reserva{count === 1 ? "" : "s"}</small>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {selectedCalendarDate && (
                            <div className="mt-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h6 className="mb-0">Reservas del día {selectedCalendarDate}</h6>
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedCalendarDate("")}>Limpiar selección</button>
                                </div>
                                {calendarSelectedDayReservations.length === 0 ? (
                                    <p className="text-muted mt-2 mb-0">No hay reservas para ese día.</p>
                                ) : (
                                    <ul className="list-group list-group-flush mt-2">
                                        {calendarSelectedDayReservations.map((reservation) => (
                                            <li key={`calendar-${reservation.id}`} className="list-group-item px-0 d-flex justify-content-between">
                                                <span>{reservation.reservation_time} - {reservation.full_name}</span>
                                                <span className="text-capitalize text-muted">{reservation.status || "pendiente"}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="table-responsive bg-white rounded p-3 shadow-sm">
                    <table className="table table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Tipo de masaje</th>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="8">Cargando reservas...</td>
                                </tr>
                            )}

                            {!loading && filteredReservations.length === 0 && (
                                <tr>
                                    <td colSpan="8">No hay reservas que coincidan con los filtros.</td>
                                </tr>
                            )}

                            {!loading && filteredReservations.map((reservation) => (
                                <tr key={reservation.id}>
                                    <td>{reservation.full_name}</td>
                                    <td>{reservation.email}</td>
                                    <td>{reservation.phone || "-"}</td>
                                    <td>{reservation.service}</td>
                                    <td>{reservation.reservation_date}</td>
                                    <td>{reservation.reservation_time}</td>
                                    <td className="text-capitalize">{reservation.status || "pendiente"}</td>
                                    <td>
                                        <div className="d-flex gap-2 flex-wrap">
                                            <button
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => seeDetails(reservation.id)}
                                                disabled={actionLoading}
                                            >
                                                Ver detalles
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => startEdit(reservation)}
                                                disabled={actionLoading}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-success"
                                                onClick={() => updateReservationStatus(reservation, "confirmada")}
                                                disabled={actionLoading || (reservation.status || "pendiente") === "confirmada"}
                                            >
                                                Confirmar
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-warning"
                                                onClick={() => updateReservationStatus(reservation, "cancelada")}
                                                disabled={actionLoading || (reservation.status || "pendiente") === "cancelada"}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => deleteReservation(reservation)}
                                                disabled={actionLoading}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {selectedReservation && (
                    <div className="card mt-4">
                        <div className="card-body">
                            <h5 className="card-title">Detalle de reserva #{selectedReservation.id}</h5>
                            <p><strong>Nombre:</strong> {selectedReservation.full_name}</p>
                            <p><strong>Email:</strong> {selectedReservation.email}</p>
                            <p><strong>Teléfono:</strong> {selectedReservation.phone || "-"}</p>
                            <p><strong>Servicio:</strong> {selectedReservation.service}</p>
                            <p><strong>Fecha:</strong> {selectedReservation.reservation_date}</p>
                            <p><strong>Hora:</strong> {selectedReservation.reservation_time}</p>
                            <p><strong>Estado:</strong> <span className="text-capitalize">{selectedReservation.status || "pendiente"}</span></p>
                            <p><strong>Mensaje:</strong> {selectedReservation.message || "-"}</p>
                        </div>
                    </div>
                )}

                {editingReservationId && editForm && (
                    <div className="card mt-4">
                        <div className="card-body">
                            <h5 className="card-title">Editar reserva #{editingReservationId}</h5>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Nombre</label>
                                    <input className="form-control" name="full_name" value={editForm.full_name} onChange={handleEditChange} />
                                    {formErrors.full_name && <small className="text-danger">{formErrors.full_name}</small>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Email</label>
                                    <input className="form-control" name="email" value={editForm.email} onChange={handleEditChange} />
                                    {formErrors.email && <small className="text-danger">{formErrors.email}</small>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Teléfono</label>
                                    <input className="form-control" name="phone" value={editForm.phone} onChange={handleEditChange} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Tipo de masaje</label>
                                    <select className="form-select" name="service" value={editForm.service} onChange={handleEditChange}>
                                        {services.map((service) => (
                                            <option key={service} value={service}>{service}</option>
                                        ))}
                                    </select>
                                    {formErrors.service && <small className="text-danger">{formErrors.service}</small>}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Fecha</label>
                                    <input className="form-control" type="date" name="reservation_date" value={editForm.reservation_date} onChange={handleEditChange} />
                                    {formErrors.reservation_date && <small className="text-danger">{formErrors.reservation_date}</small>}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Hora</label>
                                    <input className="form-control" type="time" name="reservation_time" value={editForm.reservation_time} onChange={handleEditChange} />
                                    {formErrors.reservation_time && <small className="text-danger">{formErrors.reservation_time}</small>}
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Estado</label>
                                    <select className="form-select" name="status" value={editForm.status} onChange={handleEditChange}>
                                        {getAllowedStatuses().map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                    {formErrors.status && <small className="text-danger">{formErrors.status}</small>}
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Mensaje</label>
                                    <textarea className="form-control" name="message" rows="3" value={editForm.message} onChange={handleEditChange} />
                                </div>
                            </div>
                            <div className="d-flex gap-2 mt-3">
                                <button className="btn btn-primary" onClick={() => saveEdit(editingReservationId)} disabled={actionLoading}>
                                    Guardar cambios
                                </button>
                                <button className="btn btn-outline-secondary" onClick={cancelEdit} disabled={actionLoading}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
