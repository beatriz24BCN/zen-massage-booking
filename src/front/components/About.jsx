import React from "react";

export const About = () => {
    return (
        <section id="about" className="about-section">
            <div className="container">
                <h2 className="about-title">Nosotros</h2>
                <p className="about-subtitle">Conoce la historia de Zen Massage</p>

                <div className="about-content">
                    <div className="about-text">
                        <h3>Nuestra Misión</h3>
                        <p>
                            En Zen Massage, creemos que el bienestar es fundamental para una vida plena.
                            Nuestro equipo de terapeutas certificados se dedica a proporcionar tratamientos
                            de masaje profesionales y personalizados que restauran el equilibrio entre
                            cuerpo, mente y espíritu.
                        </p>
                        <p>
                            Con más de 15 años de experiencia, hemos ayudado a miles de clientes a
                            encontrar paz, aliviar el estrés y recuperar su bienestar integral.
                        </p>
                    </div>

                    <div className="about-values">
                        <div className="value-card">
                            <h4>Profesionalismo</h4>
                            <p>Terapeutas certificados y capacitados</p>
                        </div>
                        <div className="value-card">
                            <h4>Calidad</h4>
                            <p>Tratamientos personalizados y efectivos</p>
                        </div>
                        <div className="value-card">
                            <h4>Bienestar</h4>
                            <p>Tu salud y tranquilidad son nuestras prioridades</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
