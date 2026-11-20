import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { apiFetch } from "../api";
import "../desing/Clients.css";

const emptyClient = {
  document: "",
  id_document: "",
  razon_social: "",
  representante_legal: "",
  email: "",
  address: "",
  telephone: "",
  number_cellphone: "",
};

const clientFields = [
  { name: "razon_social", label: "Razón social", required: true, maxLength: 50 },
  { name: "representante_legal", label: "Representante legal", required: true, maxLength: 100 },
  { name: "document", label: "Tipo de documento", required: true, maxLength: 50, placeholder: "Ej.: NIT" },
  { name: "id_document", label: "Número de documento", required: true },
  { name: "email", label: "Correo de la empresa", required: true, type: "email", maxLength: 100 },
  { name: "telephone", label: "Teléfono fijo", required: true, type: "tel", maxLength: 15 },
  { name: "number_cellphone", label: "Celular", type: "tel", maxLength: 20 },
  { name: "address", label: "Dirección", maxLength: 100 },
];

function getErrorMessage(result, fallback) {
  if (typeof result.detail === "string") return result.detail;
  if (Array.isArray(result.detail)) {
    return result.detail.map((item) => item.msg).filter(Boolean).join(", ") || fallback;
  }
  return result.message || fallback;
}

async function readResult(response, fallback) {
  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(getErrorMessage(result, fallback));
  }
  return result;
}

export default function ClientsScreen() {
  const navigate = useNavigate();
  const isGlobalAdmin = Number(localStorage.getItem("id_rol")) === 1001;
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/clients");
      const result = await readResult(response, "No se pudieron cargar las empresas");
      setClients(Array.isArray(result.data) ? result.data : []);
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar las empresas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load initial server data after the protected admin screen mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isGlobalAdmin) loadClients();
  }, [isGlobalAdmin, loadClients]);

  if (!isGlobalAdmin) {
    return (
      <main className="clients-access-denied">
        <p role="alert">Esta pantalla está disponible solo para el administrador global.</p>
        <button type="button" onClick={() => navigate("/seleccion-proyecto", { replace: true })}>
          Volver
        </button>
      </main>
    );
  }

  const openCreateForm = () => {
    setEditingClient(null);
    setForm(emptyClient);
    setError("");
    setFormOpen(true);
  };

  const openEditForm = (client) => {
    setEditingClient(client);
    setForm(Object.fromEntries(
      Object.keys(emptyClient).map((field) => [field, client[field] ?? ""]),
    ));
    setError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingClient(null);
    setForm(emptyClient);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = Object.fromEntries(
      Object.entries(form).map(([field, value]) => [field, value.trim()]),
    );
    payload.email = payload.email.toLowerCase();

    try {
      const isEditing = Boolean(editingClient);
      const response = await apiFetch(
        isEditing ? `/clients/${editingClient.id_cliente}` : "/clients",
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      await readResult(response, isEditing
        ? "No se pudo actualizar la empresa"
        : "No se pudo registrar la empresa");
      setFormOpen(false);
      setEditingClient(null);
      setForm(emptyClient);
      await loadClients();
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar la empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`¿Eliminar la empresa "${client.razon_social}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(client.id_cliente);
    setError("");
    try {
      const response = await apiFetch(`/clients/${client.id_cliente}`, { method: "DELETE" });
      await readResult(response, "No se pudo eliminar la empresa");
      setClients((current) => current.filter((item) => item.id_cliente !== client.id_cliente));
    } catch (deleteError) {
      setError(deleteError.message || "No se pudo eliminar la empresa");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="clients-page">
      <header className="clients-header">
        <button
          className="clients-back"
          type="button"
          onClick={() => navigate("/admin-dashboard")}
          aria-label="Volver al panel administrativo"
        >
          <ArrowLeft size={18} />
          <span>Panel administrativo</span>
        </button>
        <div className="clients-heading">
          <span className="clients-heading__icon"><Building2 size={22} /></span>
          <div>
            <p className="clients-eyebrow">ADMINISTRACIÓN GLOBAL</p>
            <h1>Empresas cliente</h1>
            <p>Registra y mantén actualizados los datos de las empresas.</p>
          </div>
        </div>
      </header>

      <section className="clients-content" aria-labelledby="clients-list-title">
        <div className="clients-toolbar">
          <div>
            <h2 id="clients-list-title">Empresas registradas</h2>
            <p>{clients.length} {clients.length === 1 ? "empresa" : "empresas"}</p>
          </div>
          <div className="clients-toolbar__actions">
            <button type="button" className="clients-button clients-button--secondary" onClick={loadClients} disabled={loading}>
              <RefreshCw size={16} /> Actualizar
            </button>
            <button type="button" className="clients-button" onClick={openCreateForm}>
              <Plus size={17} /> Registrar empresa
            </button>
          </div>
        </div>

        {error && !formOpen && <p className="clients-alert" role="alert">{error}</p>}

        {loading ? (
          <div className="clients-state" role="status">
            <LoaderCircle className="clients-spinner" size={22} /> Cargando empresas…
          </div>
        ) : error && clients.length === 0 ? (
          <div className="clients-state clients-state--error">
            <p>{error}</p>
            <button type="button" className="clients-button clients-button--secondary" onClick={loadClients}>
              Intentar de nuevo
            </button>
          </div>
        ) : clients.length === 0 ? (
          <div className="clients-state">
            <Building2 size={28} />
            <strong>Aún no hay empresas registradas</strong>
            <span>Registra una empresa para empezar.</span>
          </div>
        ) : (
          <div className="clients-table-wrap">
            <table className="clients-table">
              <thead>
                <tr>
                  <th scope="col">Empresa</th>
                  <th scope="col">Documento</th>
                  <th scope="col">Representante</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Teléfono</th>
                  <th scope="col"><span className="clients-visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id_cliente}>
                    <td data-label="Empresa"><strong>{client.razon_social}</strong></td>
                    <td data-label="Documento">{client.document} {client.id_document}</td>
                    <td data-label="Representante">{client.representante_legal}</td>
                    <td data-label="Correo"><a href={`mailto:${client.email}`}>{client.email}</a></td>
                    <td data-label="Teléfono">{client.telephone || "—"}</td>
                    <td className="clients-actions">
                      <button
                        type="button"
                        className="clients-icon-button"
                        aria-label={`Editar ${client.razon_social}`}
                        onClick={() => openEditForm(client)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="clients-icon-button clients-icon-button--danger"
                        aria-label={`Eliminar ${client.razon_social}`}
                        onClick={() => handleDelete(client)}
                        disabled={deletingId === client.id_cliente}
                      >
                        {deletingId === client.id_cliente
                          ? <LoaderCircle className="clients-spinner" size={16} />
                          : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <div className="clients-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm();
        }}>
          <section className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="clients-form-title">
            <div className="clients-modal__heading">
              <div>
                <p className="clients-eyebrow">{editingClient ? "ACTUALIZACIÓN" : "NUEVA EMPRESA"}</p>
                <h2 id="clients-form-title">{editingClient ? "Editar empresa" : "Registrar empresa"}</h2>
              </div>
              <button type="button" className="clients-icon-button" onClick={closeForm} aria-label="Cerrar formulario" disabled={saving}>
                <X size={19} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="clients-form-grid">
                {clientFields.map((field) => (
                  <label className="clients-field" key={field.name}>
                    <span>{field.label}{field.required && <span aria-hidden="true"> *</span>}</span>
                    {field.name === "document" ? (
                      <select
                        name={field.name}
                        value={form[field.name]}
                        onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                        required={field.required}
                      >
                        <option value="">Selecciona tipo</option>
                        {form[field.name] && !["CC", "TI", "NIT", "CE", "PA"].includes(form[field.name]) && (
                          <option value={form[field.name]}>{form[field.name]}</option>
                        )}
                        {["CC", "TI", "NIT", "CE", "PA"].map((documentType) => (
                          <option key={documentType} value={documentType}>{documentType}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type || "text"}
                        name={field.name}
                        value={form[field.name]}
                        onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                        placeholder={field.placeholder || ""}
                        maxLength={field.maxLength}
                        required={field.required}
                        autoComplete={field.name === "email" ? "email" : "off"}
                      />
                    )}
                  </label>
                ))}
              </div>
              <p className="clients-form-note">El teléfono fijo es obligatorio para guardar la empresa.</p>
              {error && <p className="clients-alert" role="alert">{error}</p>}
              <div className="clients-modal__actions">
                <button type="button" className="clients-button clients-button--secondary" onClick={closeForm} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="clients-button" disabled={saving}>
                  {saving && <LoaderCircle className="clients-spinner" size={16} />}
                  {saving ? "Guardando…" : editingClient ? "Guardar cambios" : "Registrar empresa"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
