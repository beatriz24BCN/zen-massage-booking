import React from "react";

export const Contact = () => {
    return (
        <section id="contact" className="contact-section">
            <div className="container">
                <h2 className="contact-title">Contacto</h2>
                <p className="contact-subtitle">Ponte en contacto con nosotros</p>

                <div className="contact-content">
                    <div className="contact-info">
                        <div className="info-item">
                            <h4>Ubicación</h4>
                            <p>Calle Principal 123, Madrid 28001</p>
                        </div>
                        <div className="info-item">
                            <h4>Teléfono</h4>
                            <p>+34 91 234 5678</p>
                        </div>
                        <div className="info-item">
                            <h4>Email</h4>
                            <p>info@zenmassage.es</p>
                        </div>
                        <div className="info-item">
                            <h4>Horarios</h4>
                            <p>Lunes a Viernes: 10:00 - 20:00</p>
                            <p>Sábado: 10:00 - 18:00</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
