import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/FoccusNB_White.png";
import { apiFetch } from "../api";
import "../desing/ProjectRegistration.css";

const formatOptions = [
  "serie", "miniserie", "pelicula", "largometraje", "mediometraje", "cortometraje",
  "documental", "spot publicitario", "video musical", "video corporativo",
  "video educativo", "micro-formato", "mockumentary",
];

const genreOptions = [
  "accion", "comedia", "aventura", "drama", "terror", "ciencia ficcion",
  "fantasia", "suspenso", "musical", "western", "belico", "romance",
  "crimen", "misterio", "animacion", "biopic", "documental", "video",
  "artes marciales", "thriller", "historico", "epoca", "familiar",
  "deportivo", "horror", "paranormal", "otro",
];

export default function ProjectRegistrationScreen() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_name: "",
    formato_de_produccion: "",
    genero: "",
    sinopsis: "",
    director: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const idClient = localStorage.getItem("id_client");
      const response = await apiFetch("/projects/create", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          id_client: Number(idClient),
          id_user: Number(localStorage.getItem("id_user")),
        }),
      });

      if (response.ok) {
        navigate("/seleccion-proyecto");
      } else {
        const errorData = await response.json();

        const mensaje = typeof errorData.detail === "string"
          ? errorData.detail
          : Array.isArray(errorData.detail)
            ? errorData.detail.map(e => e.msg).join(", ")
            : errorData.message || "Error al crear el proyecto";
        setError(mensaje);

      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="prs-page">
      <div className="prs-container">
        {/* Logo */}
        <div className="prs-logo-wrapper">
          <img src={logo} alt="Logo" className="prs-logo" />
        </div>

        {/* Card */}
        <div className="prs-card">
          {/* Header */}
          <div className="prs-card-header">
            <p className="prs-card-header-eyebrow">
              Primer paso
            </p>
            <h1 className="prs-card-header-title">
              Crea tu primer proyecto
            </h1>
            <p className="prs-card-header-subtitle">
              Registra los datos de tu producción audiovisual para comenzar a trabajar.
            </p>
          </div>

          <div className="prs-card-body">
            {/* Error */}
            {error && (
              <div className="prs-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="prs-form">
              <div className="prs-field">
                <label className="prs-label">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  className="prs-input"
                  placeholder="Nombre de la serie, película u otro proyecto audiovisual"
                  required
                />
              </div>

              <div className="prs-grid-2">
                <div className="prs-field">
                  <label className="prs-label">Formato</label>
                  <select
                    name="formato_de_produccion"
                    value={formData.formato_de_produccion}
                    onChange={handleChange}
                    className="prs-select"
                    required
                  >
                    <option value="">Selecciona un formato</option>
                    {formatOptions.map((format) => (
                      <option key={format} value={format}>
                        {format.charAt(0).toUpperCase() + format.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="prs-field">
                  <label className="prs-label">Género</label>
                  <select
                    name="genero"
                    value={formData.genero}
                    onChange={handleChange}
                    className="prs-select"
                    required
                  >
                    <option value="">Selecciona un género</option>
                    {genreOptions.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre.charAt(0).toUpperCase() + genre.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="prs-field">
                <label className="prs-label">Sinopsis</label>
                <textarea
                  name="sinopsis"
                  value={formData.sinopsis}
                  onChange={handleChange}
                  rows={4}
                  className="prs-textarea"
                  placeholder="Detalle de lo que trata el producto audiovisual"
                />
              </div>

              <div className="prs-field">
                <label className="prs-label">Director</label>
                <input
                  type="text"
                  name="director"
                  value={formData.director}
                  onChange={handleChange}
                  className="prs-input"
                  placeholder="Director o directores del producto audiovisual"
                />
              </div>

              <div className="prs-submit-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="prs-submit-button"
                >
                  {loading ? "Creando..." : "Crear Proyecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
