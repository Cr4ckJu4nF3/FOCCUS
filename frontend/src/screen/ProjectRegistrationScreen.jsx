import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Logo_Negativo.png";
import API_URL from "../api";

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
      const response = await fetch(`${API_URL}/projects/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="min-h-screen bg-[#0A0A0A] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Logo" className="h-16" />
        </div>

        {/* Card */}
        <div className="bg-[#1A1A1A] rounded-lg shadow-lg border border-[#2A2A2A] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#7B5FCF] to-[#0B4F8A] px-8 py-6">
            <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-1">
              Primer paso
            </p>
            <h1 className="text-white text-xl font-semibold tracking-wide">
              Crea tu primer proyecto
            </h1>
            <p className="text-white/70 text-sm mt-1 leading-relaxed">
              Registra los datos de tu producción audiovisual para comenzar a trabajar.
            </p>
          </div>

          <div className="p-8">
            {/* Error */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 text-[#FAFAFA]">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA]"
                  placeholder="Nombre de la serie, película u otro proyecto audiovisual"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-[#FAFAFA]">Formato</label>
                  <select
                    name="formato_de_produccion"
                    value={formData.formato_de_produccion}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA]"
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

                <div>
                  <label className="block mb-2 text-[#FAFAFA]">Género</label>
                  <select
                    name="genero"
                    value={formData.genero}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA]"
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

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Sinopsis</label>
                <textarea
                  name="sinopsis"
                  value={formData.sinopsis}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA] resize-none"
                  placeholder="Detalle de lo que trata el producto audiovisual"
                />
              </div>

              <div>
                <label className="block mb-2 text-[#FAFAFA]">Director</label>
                <input
                  type="text"
                  name="director"
                  value={formData.director}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B5FCF] bg-[#0A0A0A] text-[#FAFAFA]"
                  placeholder="Director o directores del producto audiovisual"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#7B5FCF] text-white px-8 py-3 rounded-lg hover:bg-[#6a4eb8] transition-colors shadow-lg shadow-[#7B5FCF]/20 disabled:opacity-50"
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