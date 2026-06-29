import React from "react";
import { useNavigate } from "react-router-dom";

import relajante from "../assets/img/masaje-relajante.jpg";
import deportivo from "../assets/img/masaje-deportivo.jpg";
import piedras from "../assets/img/piedras-calientes.jpg";
import masajeTailandes from "../assets/img/masaje-tailandes.png";

export const Services = () => {
    const navigate = useNavigate();

    return (

        <section id="services" className="services">

            <div className="container">

                <h2 className="services-title">
                    Nuestros Servicios
                </h2>

                <div className="services-grid">

                    {/* Card 1 */}
                    <div className="service-card">

                        <img
                            src={relajante}
                            alt="Masaje relajante"
                            className="service-img"
                        />

                        <div className="service-body">

                            <h3>Masaje Relajante</h3>

                            <p>
                                Alivia el estrés y recupera el equilibrio entre cuerpo y mente.
                            </p>

                            <span className="price">40 €</span>

                            <button className="service-btn" onClick={() => navigate("/reservar")}>
                                Reservar ahora
                            </button>

                        </div>

                    </div>

                    {/* Card 2 */}
                    <div className="service-card">

                        <img
                            src={deportivo}
                            alt="Masaje deportivo"
                            className="service-img"
                        />

                        <div className="service-body">

                            <h3>Masaje Deportivo</h3>

                            <p>
                                Ideal para deportistas y recuperación muscular.
                            </p>

                            <span className="price">50 €</span>

                            <button className="service-btn" onClick={() => navigate("/reservar")}>
                                Reservar ahora
                            </button>

                        </div>

                    </div>

                    {/* Card 3 */}
                    <div className="service-card">

                        <img
                            src={piedras}
                            alt="Masaje con piedras calientes"
                            className="service-img"
                        />

                        <div className="service-body">

                            <h3>Piedras Calientes</h3>

                            <p>
                                Relaja la musculatura profunda mediante calor terapéutico.
                            </p>

                            <span className="price">65 €</span>

                            <button className="service-btn" onClick={() => navigate("/reservar")}>
                                Reservar ahora
                            </button>

                        </div>

                    </div>

                    {/* Card 4 */}
                    <div className="service-card">

                        <img
                            src={masajeTailandes}
                            alt="Masaje tailandés"
                            className="service-img"
                        />

                        <div className="service-body">

                            <h3>Masaje Tailandés</h3>

                            <p>
                                Estiramientos y presión para mejorar la flexibilidad y el bienestar.
                            </p>

                            <span className="price">55 €</span>

                            <button className="service-btn" onClick={() => navigate("/reservar")}>
                                Reservar ahora
                            </button>

                        </div>

                    </div>

                </div>

            </div>

        </section>

    );
};