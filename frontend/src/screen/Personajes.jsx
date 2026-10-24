import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Plus, PenLine, Trash2, X } from "lucide-react";
import { apiFetch, getActiveRole } from "../api";
import "../desing/Personajes.css";

const formVacio = { nombre: "", descripcion: "" };

export default function PersonajesScreen() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("projectId") || "";
  const projectName = localStorage.getItem("projectName") || "Proyecto";
  const idRol = getActiveRole();
  const esAdmin = idRol === 1001;

  const [personajes, setPersonajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(formVacio);

  const fetchPersonajes = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/projects/${projectId}/personajes`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "No se pudieron cargar los personajes");
      }
      setPersonajes((data.data || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (err) {
      setError(err.message || "No se pudieron cargar los personajes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      // Sin proyecto seleccionado (p. ej. sesion reiniciada) no se puede
      // trabajar con personajes: volver a la seleccion de proyecto.
      navigate("/seleccion-proyecto", { replace: true });
      return;
    }
    fetchPersonajes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!error && !success) return;
    const timeout = setTimeout(() => {
      setError("");
      setSuccess("");
    }, 4000);
    return () => clearTimeout(timeout);
  }, [error, success]);

  const openCreateModal = () => {
    setEditandoId(null);
    setForm(formVacio);
    setShowModal(true);
  };

  const openEditModal = (personaje) => {
    setEditandoId(personaje.id_personaje);
    setForm({ nombre: personaje.nombre, descripcion: personaje.descripcion || "" });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError("El nombre del personaje es obligatorio");
      return;
    }
    try {
      const response = await apiFetch(editandoId ? `/personajes/${editandoId}` : "/personajes", {
        method: editandoId ? "PATCH" : "POST",
        body: JSON.stringify(
          editandoId
            ? { nombre: form.nombre.trim(), descripcion: form.descripcion || null }
            : { nombre: form.nombre.trim(), descripcion: form.descripcion || null, id_project: projectId }
        ),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "No se pudo guardar el personaje");
      }

      if (editandoId) {
        setPersonajes((prev) =>
          prev.map((p) => (p.id_personaje === editandoId ? data.data : p)).sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
      } else {
        setPersonajes((prev) => [...prev, data.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
      setSuccess(editandoId ? "Personaje actualizado correctamente" : "Personaje creado correctamente");
      setShowModal(false);
    } catch (err) {
      setError(err.message || "No se pudo guardar el personaje");
    }
  };

  const handleDelete = async (id, evt) => {
    evt.stopPropagation();
    if (!window.confirm("¿Eliminar este personaje? Esta acción no se puede deshacer.")) return;
    try {
      const response = await apiFetch(`/personajes/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "No se pudo eliminar el personaje");
      }
      setPersonajes((prev) => prev.filter((p) => p.id_personaje !== id));
      setSuccess("Personaje eliminado correctamente");
    } catch (err) {
      setError(err.message || "No se pudo eliminar el personaje");
    }
  };

  return (
    <div className={`personajes-page ${esAdmin ? "module-role-admin" : "module-role-user"}`}>
      <header className="personajes-header">
        <div className="personajes-header__inner">
          <button type="button" className="personajes-back" onClick={() => navigate("/proyecto-dashboard")}>
            <ArrowLeft size={18} />
            Volver
          </button>
          <div className="personajes-header__badge">
            <Users size={18} />
            {projectName}
          </div>
        </div>
      </header>

      <main className="personajes-main personajes-main--single">
        {(error || success) && (
          <div className={`personajes-message ${error ? "personajes-message--error" : "personajes-message--success"}`}>
            {error || success}
          </div>
        )}

        <section className="personajes-panel personajes-panel--wide">
          <div className="personajes-panel__header">
            <div className="personajes-panel__title-row">
              <Users size={20} />
              <h2>Personajes</h2>
            </div>
            <span>{personajes.length} registros</span>
          </div>

          <div className="personajes-toolbar personajes-toolbar--row">
            {esAdmin && (
              <button type="button" className="personajes-button" onClick={openCreateModal}>
                <Plus size={16} /> Nuevo personaje
              </button>
            )}
          </div>

          {loading ? (
            <p className="personajes-empty">Cargando personajes...</p>
          ) : personajes.length === 0 ? (
            <p className="personajes-empty">Aún no hay personajes en este proyecto.</p>
          ) : (
            <div className="personajes-table">
              <div className="personajes-table__head">
                <span>Nombre</span>
                <span>Descripción</span>
                <span />
              </div>
              {personajes.map((personaje) => (
                <div key={personaje.id_personaje} className="personajes-row">
                  <span className="personajes-row__nombre">{personaje.nombre}</span>
                  <span className="personajes-row__descripcion">{personaje.descripcion || "Sin descripción"}</span>
                  <span className="personajes-row__actions">
                    {esAdmin && (
                      <>
                        <button type="button" title="Editar personaje" onClick={() => openEditModal(personaje)}>
                          <PenLine size={16} />
                        </button>
                        <button type="button" title="Eliminar personaje" onClick={(evt) => handleDelete(personaje.id_personaje, evt)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <div className="personajes-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="personajes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="personajes-modal__header">
              <h3>{editandoId ? "Editar personaje" : "Nuevo personaje"}</h3>
              <button className="personajes-modal__close" type="button" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="personajes-form personajes-form--modal">
              <label>
                Nombre
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. María"
                  autoFocus
                />
              </label>
              <label>
                Descripción
                <textarea
                  rows={4}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Perfil, motivaciones, arco del personaje..."
                />
              </label>

              <button type="submit" className="personajes-button">
                <Plus size={18} />
                {editandoId ? "Guardar cambios" : "Crear personaje"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
