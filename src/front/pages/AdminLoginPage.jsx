import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resolveBackendUrl } from "../utils/backendUrl";
import { clearAdminSession, setAdminSession } from "../utils/adminAuth";

export const AdminLoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const navigate = useNavigate();
    const location = useLocation();
    const backendUrl = useMemo(() => resolveBackendUrl(), []);
    const redirectPath = location.state?.from || "/admin/reservations";

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");

        if (!email.trim() || !password.trim()) {
            setErrorMessage("Email y contraseña son obligatorios.");
            return;
        }

        setLoading(true);
        clearAdminSession();

        try {
            const response = await fetch(`${backendUrl}/api/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "No se pudo iniciar sesión");
            }

            setAdminSession({
                token: data.token,
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                user: data.user
            });
            navigate(redirectPath, { replace: true });
        } catch (error) {
            setErrorMessage(error.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="reservation-section">
            <div className="container" style={{ paddingTop: "130px", paddingBottom: "40px", maxWidth: "680px" }}>
                <div className="bg-white rounded p-4 shadow-sm">
                    <h2 className="reservation-title mb-2">Acceso Administrador</h2>
                    <p className="reservation-subtitle mb-4">Inicia sesión para gestionar reservas en el panel profesional.</p>

                    {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="admin@zenmassage.com"
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Contraseña</label>
                            <input
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Tu contraseña"
                            />
                        </div>

                        <button type="submit" className="btn reserve-btn w-100" disabled={loading}>
                            {loading ? "Validando..." : "Entrar al panel"}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};
