import React from "react";
import { useNavigate } from "react-router-dom";
import heroSpaImage from "../assets/img/hero-spa.jpg";

export const Hero = () => {
    const navigate = useNavigate();

    return (
        <section id="home" className="hero" style={{ backgroundImage: `url(${heroSpaImage})` }}>
            <div className="hero-overlay"></div>

            <div className="hero-content">
                <h1 className="hero-title">
                    Encuentra tu equilibrio
                </h1>
                <p className="hero-subtitle">
                    Regálate un momento de calma y bienestar con nuestros tratamientos.
                </p>
                <button className="hero-btn" onClick={() => navigate("/reservar")}>
                    Reservar cita
                </button>
            </div>
        </section>
    );
};
