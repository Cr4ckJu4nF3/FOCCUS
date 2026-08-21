import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import bgImage from "../assets/landing.jpeg";
import isologo from "../assets/FoccusLGWhite.png";
import logo from "../assets/Logo.png";
import FoccusWhiteFull from "../assets/FoccusWhiteFull.png";
import "../desing/Landing.css";

export default function FoccusLanding() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const navbarRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [mensajeContacto, setMensajeContacto] = useState("");

  const navLinks = [
    { id: "home", label: "Inicio" },
    { id: "nosotros", label: "Nosotros" },
    { id: "servicios", label: "Servicios" },
    { id: "contacto", label: "Contacto" },
  ];

  const goToLogin = () => navigate("/login");

  // ── Navbar con scroll + sección activa (de LandingScreen) ──
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = document.querySelectorAll("section[id]");
      let current = "home";
      sections.forEach((section) => {
        const navbarHeight = navbarRef.current?.offsetHeight || 0;
        if (window.scrollY >= section.offsetTop - navbarHeight - 100) {
          current = section.getAttribute("id");
        }
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Fade-in al hacer scroll (de LandingScreen) ──
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("fade-in");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" }
    );
    document
      .querySelectorAll(".root .card, .root .valor-card, .root .text-block")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const target = document.getElementById(sectionId);
    if (target) {
      const navbarHeight = navbarRef.current?.offsetHeight || 0;
      window.scrollTo({ top: target.offsetTop - navbarHeight, behavior: "smooth" });
    }
    setMenuOpen(false);
  };

  // ── Envío de formulario de contacto (de LandingScreen) ──
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensajeContacto("");

    const form = e.target;
    try {
      const response = await fetch("http://127.0.0.1:8000/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.value,
          email: form.email.value,
          celular: form.celular.value,
          empresa: form.empresa.value,
          tipo: form.tipo.value,
          mensaje: form.mensaje.value,
        }),
      });

      if (response.ok) {
        setMensajeContacto("¡Mensaje enviado exitosamente! Nos pondremos en contacto contigo pronto.");
        form.reset();
      } else {
        setMensajeContacto("Error al enviar el mensaje. Intenta de nuevo.");
      }
    } catch (err) {
      setMensajeContacto("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
      setTimeout(() => setMensajeContacto(""), 5000);
    }
  };

  return (
    <div className="root">
      {/* ── NAVBAR (diseño de landing.jsx, con lógica de scroll de LandingScreen) ── */}
      <nav className={`nav ${scrolled ? "nav--scrolled" : ""}`} ref={navbarRef}>
        <a href="#home" onClick={(e) => scrollToSection(e, "home")}>
          <img src={logo} alt="Foccus logo" className="logo" />
        </a>

        <ul className="nav-links">
          {navLinks.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className={`nav-link ${activeSection === link.id ? "nav-link--active" : ""}`}
                onClick={(e) => scrollToSection(e, link.id)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <button onClick={goToLogin} className="cta-outline">
          Comenzar Gratis
        </button>

        {/* Mobile hamburger */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          ☰
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mobile-menu">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="mobile-link"
              onClick={(e) => scrollToSection(e, link.id)}
            >
              {link.label}
            </a>
          ))}

          <button
            onClick={goToLogin}
            className="cta-filled"
            style={{ alignSelf: "flex-start" }}
          >
            Comenzar Gratis →
          </button>
        </div>
      )}

      {/* ── HERO (idéntico al de landing.jsx) ── */}
      <section
        className="hero"
        id="home"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="hero-content">
          <p className="eyebrow">
            PLATAFORMA DE CONTINUIDAD CINEMATOGRÁFICA
          </p>

          {/* Logo */}
          <h1 className="hero-title">
            <span>
              <img
                src={isologo}
                alt="Foccus Isologo"
                className="isologo"
              />
            </span>
          </h1>

          <p className="hero-subtitle">
            La plataforma profesional donde los productores montan,
            <br />
            gestionan y mantienen la continuidad de cada proyecto
            <br />
            cinematográfico.
          </p>

          <div className="btn-row">
            <button onClick={goToLogin} className="cta-filled">
              Comenzar Gratis →
            </button>
          </div>
        </div>
      </section>

      {/* ── NOSOTROS (contenido de LandingScreen, estética de landing.jsx) ── */}
      <section className="section" id="nosotros">
        <div className="section-header">
          <h2 className="section-title">Quiénes Somos</h2>
          <p className="section-subtitle">Revolucionando la producción audiovisual en Latinoamérica</p>
        </div>
        <div className="text-block mb-xl">
          <p>Somos FOCCUS, la plataforma integral que revoluciona la producción audiovisual en Latinoamérica.</p>
          <p>Combinamos la visualización de guiones, desglose de producción y continuidad visual en una sola herramienta potenciada por inteligencia artificial. No somos otra herramienta más. Somos el puente entre la creatividad y la eficiencia, entre la visión artística y la ejecución impecable.</p>
          <p>Diseñada en Colombia para el mundo hispanohablante, FOCCUS entiende que hacer cine es tanto arte, como oficio, tanto pasión, como precisión. Por eso, creamos una plataforma que respeta ambos: profesional sin ser fría, innovadora sin ser complicada y poderosa sin perder humanidad.</p>
        </div>
        <div className="valores-grid mb-xl">
          <div className="valor-card">
            <div className="valor-card__numero">01</div>
            <h3 className="valor-card__titulo">Misión</h3>
            <p className="valor-card__descripcion">Liberar el potencial creativo de los equipos audiovisuales eliminando la fricción técnica. Cuando la tecnología gestiona los detalles, los equipos pueden enfocarse en lo que realmente importa: la magia de contar historias.</p>
          </div>
          <div className="valor-card">
            <div className="valor-card__numero">02</div>
            <h3 className="valor-card__titulo">Visión</h3>
            <p className="valor-card__descripcion">Para 2030, ser la plataforma líder en gestión de producción audiovisual en Latinoamérica, presente en el 70% de las producciones profesionales de habla hispana. No solo queremos cambiar cómo se hacen las películas, queremos cambiar quién puede hacerlas.</p>
          </div>
        </div>
        <div className="section-header mt-xl">
          <h3 className="section-title">Nuestros Valores</h3>
        </div>
        <div className="valores-grid">
          <div className="valor-card">
            <div className="valor-card__numero">01</div>
            <h4 className="valor-card__titulo">Precisión con Propósito</h4>
            <p className="valor-card__descripcion">Cada frame cuenta, cada detalle importa.</p>
          </div>
          <div className="valor-card">
            <div className="valor-card__numero">02</div>
            <h4 className="valor-card__titulo">Innovación</h4>
            <p className="valor-card__descripcion">Complejidad técnica, simplicidad de uso.</p>
          </div>
          <div className="valor-card">
            <div className="valor-card__numero">03</div>
            <h4 className="valor-card__titulo">Colaboración</h4>
            <p className="valor-card__descripcion">El cine es equipo.</p>
          </div>
          <div className="valor-card">
            <div className="valor-card__numero">04</div>
            <h4 className="valor-card__titulo">Excelencia</h4>
            <p className="valor-card__descripcion">Construimos para durar.</p>
          </div>
          <div className="valor-card">
            <div className="valor-card__numero">05</div>
            <h4 className="valor-card__titulo">Latinoamérica primero</h4>
            <p className="valor-card__descripcion">No somos traducción, somos nativos.</p>
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section className="section section--dark" id="servicios">
        <div className="section-header">
          <h2 className="section-title">Nuestros Servicios</h2>
          <p className="section-subtitle">Una plataforma integral que cubre todo el ciclo de producción</p>
        </div>
        <div className="cards">
          <article className="card">
            <div className="card__header card__header--escritura">
              <h3 className="card__title">Visualización de Guiones</h3>
            </div>
            <div className="card__body">
              <p className="card__description">Visualizador profesional con formato automático estándar Hollywood.</p>
              <ul className="card__features">
                <li className="card__feature">Visualización sin conexión</li>
                <li className="card__feature">Control de versiones integrado</li>
                <li className="card__feature">Exportación PDF estándar industria, con marcas de agua dinámicas</li>
                <li className="card__feature">Creación de personaje y escenas directamente desde el guión</li>
                <li className="card__feature">Biblioteca de personajes y locaciones</li>
              </ul>
              <a href="#contacto" className="card__button" onClick={(e) => scrollToSection(e, "contacto")}>Conocer más</a>
            </div>
          </article>
          <article className="card">
            <div className="card__header card__header--desglose">
              <h3 className="card__title">Desglose de Producción</h3>
            </div>
            <div className="card__body">
              <p className="card__description">De guion a personajes, locaciones, utilería y necesidades técnicas de cada escena.</p>
              <ul className="card__features">
                <li className="card__feature">Vista personalizada por departamento</li>
                <li className="card__feature">Anotaciones privadas y públicas</li>
                <li className="card__feature">Gestión de inventario de producción</li>
                <li className="card__feature">Calendario de rodaje optimizado</li>
                <li className="card__feature">Exportación de desglose según rol</li>
                <li className="card__feature">Reportes de producción en un clic</li>
              </ul>
              <a href="#contacto" className="card__button" onClick={(e) => scrollToSection(e, "contacto")}>Conocer más</a>
            </div>
          </article>
          <article className="card">
            <div className="card__header card__header--continuidad">
              <h3 className="card__title">Continuidad Visual</h3>
            </div>
            <div className="card__body">
              <p className="card__description">Permite capturar y segmentar fotos al instante por escena, toma y personaje.</p>
              <ul className="card__features">
                <li className="card__feature">Permite colocar dos fotos lado a lado para comparar</li>
                <li className="card__feature">Línea de tiempo donde muestra las fotos de acuerdo con el orden de la historia</li>
                <li className="card__feature">Notas del script, onset o supervisor integradas</li>
                <li className="card__feature">Acceso desde set (móvil/tablet/pc), con o sin red</li>
              </ul>
              <a href="#contacto" className="card__button" onClick={(e) => scrollToSection(e, "contacto")}>Conocer más</a>
            </div>
          </article>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section className="section" id="contacto">
        <div className="section-header">
          <h2 className="section-title">Contacto</h2>
          <p className="section-subtitle">¿Listo para revolucionar tu flujo de producción? Hablemos.</p>
        </div>
        <form className="form-contact" onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label htmlFor="nombre" className="form-label">Nombre Completo *</label>
            <input type="text" id="nombre" name="nombre" className="form-input" required placeholder="Ej: Juan Pérez" />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email *</label>
            <input type="email" id="email" name="email" className="form-input" required placeholder="tu@email.com" />
          </div>
          <div className="form-group">
            <label htmlFor="celular" className="form-label">Celular *</label>
            <input type="text" id="celular" name="celular" className="form-input" required placeholder="320 2 222222" />
          </div>
          <div className="form-group">
            <label htmlFor="empresa" className="form-label">Empresa / Productora</label>
            <input type="text" id="empresa" name="empresa" className="form-input" placeholder="Ej: Producciones VisualArt" />
          </div>
          <div className="form-group">
            <label htmlFor="tipo" className="form-label">Tipo de Consulta</label>
            <select id="tipo" name="tipo" className="form-select">
              <option value="demo">Solicitar Demo</option>
              <option value="pricing">Información de Precios</option>
              <option value="soporte">Soporte Técnico</option>
              <option value="partnership">Alianzas / Partnership</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="mensaje" className="form-label">Mensaje *</label>
            <textarea id="mensaje" name="mensaje" className="form-textarea" required placeholder="Cuéntanos qué necesitas..." />
          </div>
          {mensajeContacto && (
            <div className={`form-message ${mensajeContacto.includes("exitosamente") ? "form-message--success" : "form-message--error"}`}>
              {mensajeContacto}
            </div>
          )}
          <button type="submit" className="form-button" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar Mensaje"}
          </button>
        </form>
        <div className="text-block mt-xl text-center">
          <h3 className="color-accent mb-md">Información de Contacto</h3>
          <p><strong>Email:</strong>{" "}<a href="mailto:foccuscompany.org@gmail.com" className="color-accent-2">foccuscompany.org@gmail.com</a></p>
          <p><strong>Teléfono:</strong>{" "}<a href="tel:+573024699797" className="color-accent-2">+57 302 469 9797</a></p>
          <p><strong>Dirección:</strong><br />Parque Central de Fontibón I PH<br />Calle 16 F # 99-72<br />Bogotá, Colombia</p>
        </div>
        <div className="map-container">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3867.828912209627!2d-74.15078851397652!3d4.67080033514895!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9d82185c81af%3A0xec4a25bde3ffcb50!2sConjunto%20Parque%20Central%20Fontib%C3%B3n%201!5e0!3m2!1sen!2sco!4v1781998812765!5m2!1sen!2sco"
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación FOCCUS"
          />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer__content">
          <div className="footer__logo">
            <img src={FoccusWhiteFull} alt="FOCCUS" className="footer__logo-img" />
          </div>
          <nav>
            <ul className="footer__links">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} className="footer__link" onClick={(e) => scrollToSection(e, link.id)}>
                    {link.label}
                  </a>
                </li>
              ))}
              <li><a href="#" className="footer__link">Términos y Condiciones</a></li>
              <li><a href="#" className="footer__link">Política de Privacidad</a></li>
            </ul>
          </nav>
        </div>
        <div className="footer__copy"><p>&copy; 2026 FOCCUS. Todos los derechos reservados. Hecho en Colombia.</p></div>
      </footer>
    </div>
  );
}
