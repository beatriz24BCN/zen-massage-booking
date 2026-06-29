import React from "react";
import { useNavigate, NavLink } from "react-router-dom";
import logo from "../assets/img/logo-loto.png";

export const Navbar = () => {
	const navigate = useNavigate();

	return (
		<nav className="navbar navbar-expand-lg custom-navbar fixed-top">

			<div className="container">

				{/* Logo */}
				<NavLink to="/" className="navbar-brand logo">
					<img
						src={logo}
						alt="Zen Massage"
						className="logo-img"
					/>
				</NavLink>

				{/* Botón móvil */}
				<button
					className="navbar-toggler"
					type="button"
					data-bs-toggle="collapse"
					data-bs-target="#navbarNav"
					aria-controls="navbarNav"
					aria-expanded="false"
					aria-label="Toggle navigation"
				>
					<span className="navbar-toggler-icon"></span>
				</button>

				{/* Menú */}
				<div
					className="collapse navbar-collapse"
					id="navbarNav"
				>

					<ul className="navbar-nav mx-auto">

						<li className="nav-item">
							<NavLink to="/" className="nav-link">Inicio</NavLink>
						</li>

						<li className="nav-item">
							<NavLink to="/servicios" className="nav-link">Servicios</NavLink>
						</li>

						<li className="nav-item">
							<NavLink to="/nosotros" className="nav-link">Nosotros</NavLink>
						</li>

						<li className="nav-item">
							<NavLink to="/galeria" className="nav-link">Galería</NavLink>
						</li>

						<li className="nav-item">
							<NavLink to="/contacto" className="nav-link">Contacto</NavLink>
						</li>

					</ul>

					<button className="btn reserve-btn" onClick={() => navigate("/reservar")}>
						Reservar ahora
					</button>

				</div>

			</div>

		</nav>
	);
};