import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Navigate, useLocation } from "react-router-dom";
import { resolveBackendUrl } from "../utils/backendUrl";
import { authFetch, clearAdminSession, getAdminRefreshToken, getAdminToken } from "../utils/adminAuth";

export const RequireAdminAuth = ({ children }) => {
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const location = useLocation();
    const backendUrl = useMemo(() => resolveBackendUrl(), []);

    useEffect(() => {
        const token = getAdminToken();
        const refreshToken = getAdminRefreshToken();
        if (!token && !refreshToken) {
            setIsAuthorized(false);
            setIsChecking(false);
            return;
        }

        const verify = async () => {
            try {
                const response = await authFetch(backendUrl, "/api/admin/me", {
                    method: "GET"
                });

                if (!response.ok) {
                    clearAdminSession();
                    setIsAuthorized(false);
                    return;
                }

                setIsAuthorized(true);
            } catch {
                clearAdminSession();
                setIsAuthorized(false);
            } finally {
                setIsChecking(false);
            }
        };

        verify();
    }, [backendUrl]);

    if (isChecking) {
        return (
            <section className="reservation-section">
                <div className="container" style={{ paddingTop: "130px", paddingBottom: "40px" }}>
                    <div className="alert alert-info mb-0">Verificando sesión de administrador...</div>
                </div>
            </section>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
    }

    return children;
};

RequireAdminAuth.propTypes = {
    children: PropTypes.node.isRequired
};
