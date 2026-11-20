import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "../api";

const errorMessage = (result, fallback) => {
  const detail = Array.isArray(result.detail)
    ? result.detail.map((item) => item.msg).join(", ")
    : result.detail;
  return detail || result.message || fallback;
};

export default function EditProjectModal({ projectId, formatOptions, genreOptions, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProject = async () => {
      try {
        const response = await apiFetch(`/projects/${encodeURIComponent(projectId)}`);
        const result = await response.json();
        if (!response.ok || !result.success || !result.data) {
          throw new Error(errorMessage(result, "No se pudo cargar el proyecto"));
        }
        if (active) {
          setForm({
            project_name: result.data.project_name || "",
            formato_de_produccion: result.data.formato_de_produccion || "",
            genero: result.data.genero || "",
            sinopsis: result.data.sinopsis || "",
            director: result.data.director || "",
          });
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "No se pudo cargar el proyecto");
      }
    };
    loadProject();
    return () => { active = false; };
  }, [projectId]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      project_name: form.project_name.trim(),
    };
    if (!payload.project_name) {
      setError("Escribe un nombre para el proyecto");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch(`/projects/${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(errorMessage(result, "No se pudo actualizar el proyecto"));
      }
      onSaved({ ...payload, project_name: result.data?.project_name ?? payload.project_name });
    } catch (saveError) {
      setError(saveError.message || "No se pudo actualizar el proyecto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-project-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="admin-project-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="edit-project-title">
        <header className="admin-project-modal__header">
          <div><p className="admin-eyebrow">PROYECTO ACTIVO</p><h2 id="edit-project-title">Editar proyecto</h2></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar"><X size={20} /></button>
        </header>
        {error && <div className="admin-project-modal__error" role="alert">{error}</div>}
        {!form ? (
          !error && <p role="status">Cargando proyecto…</p>
        ) : (
          <form className="admin-project-form" onSubmit={handleSubmit}>
            <label>
              Nombre del proyecto
              <input name="project_name" value={form.project_name} onChange={updateField} maxLength={45} required />
            </label>
            <div className="admin-project-form__grid">
              <label>
                Formato
                <select name="formato_de_produccion" value={form.formato_de_produccion} onChange={updateField} required>
                  <option value="">Selecciona un formato</option>
                  {form.formato_de_produccion && !formatOptions.includes(form.formato_de_produccion) && (
                    <option value={form.formato_de_produccion}>{form.formato_de_produccion}</option>
                  )}
                  {formatOptions.map((option) => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                </select>
              </label>
              <label>
                Género
                <select name="genero" value={form.genero} onChange={updateField} required>
                  <option value="">Selecciona un género</option>
                  {form.genero && !genreOptions.includes(form.genero) && (
                    <option value={form.genero}>{form.genero}</option>
                  )}
                  {genreOptions.map((option) => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                </select>
              </label>
            </div>
            <label>
              Sinopsis
              <textarea name="sinopsis" rows={3} value={form.sinopsis} onChange={updateField} />
            </label>
            <label>
              Director
              <input name="director" value={form.director} onChange={updateField} maxLength={255} />
            </label>
            <footer className="admin-project-form__actions">
              <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
