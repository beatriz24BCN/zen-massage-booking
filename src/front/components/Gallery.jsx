import React from "react";
import relajante from "../assets/img/masaje-relajante.jpg";
import deportivo from "../assets/img/masaje-deportivo.jpg";
import piedras from "../assets/img/piedras-calientes.jpg";
import tailandes from "../assets/img/masaje-tailandes.png";
import heroSpa from "../assets/img/hero-spa.jpg";
import galeria6 from "../assets/img/galeria-6.jpg";

export const Gallery = () => {
    const galleryImages = [
        { id: 1, src: relajante, alt: "Masaje Relajante", title: "Relajación" },
        { id: 2, src: deportivo, alt: "Masaje Deportivo", title: "Deportivo" },
        { id: 3, src: piedras, alt: "Piedras Calientes", title: "Terapia Caliente" },
        { id: 4, src: tailandes, alt: "Masaje Tailandés", title: "Tailandés" },
        { id: 5, src: heroSpa, alt: "Espacio Spa", title: "Nuestro Spa" },
        { id: 6, src: galeria6, alt: "Galería", title: "Galería" }
    ];

    return (
        <section className="gallery-section">
            <div className="container">
                <h2 className="gallery-title">Galería</h2>
                <p className="gallery-subtitle">Nuestro espacio y tratamientos</p>

                <div className="gallery-grid">
                    {galleryImages.map((image) => (
                        <div key={image.id} className="gallery-item">
                            <img src={image.src} alt={image.alt} className="gallery-image" />
                            <div className="gallery-overlay">
                                <h3>{image.title}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
