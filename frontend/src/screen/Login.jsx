import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import logo from "../assets/Logo.png";
import claqueta from "../assets/claqueta.jpg";
import { apiFetch, getDeviceId, setToken } from "../api";
import "../desing/Login.css";

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState("ingresar");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  // Campos del login
  const [mail, setMail] = useState("");
  const [contrasena, setContrasena] = useState("");

  // Campos del registro (RegisterSchema: empresa + usuario)
  const [registro, setRegistro] = useState({
    // Datos empresa
    razon_social: "",
    representante_legal: "",
    email_empresa: "",
    address: "",
    telephone: "",
    number_cellphone: "",
    document: "",
    id_document: "",
    // Datos usuario
    nombre: "",
    apellido: "",
    mail: "",
    msisdn: "",
    contrasena: "",
    confirmarContrasena: "",
  });

  const validarContrasena = (password) => {
  const reglas = [];
  if (password.length < 8) reglas.push("Mínimo 8 caracteres");
  if (!/[a-z]/.test(password)) reglas.push("Una letra minúscula");
  if (!/[A-Z]/.test(password)) reglas.push("Una letra mayúscula");
  if (!/[0-9]/.test(password)) reglas.push("Un número");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) reglas.push("Un carácter especial");
  return reglas;
};

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedMail = mail.trim().toLowerCase();
      const response = await apiFetch("/users/login", {
        method: "POST",
        body: JSON.stringify({ mail: normalizedMail, contrasena }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const data = result.data;

        // Guardar el token de sesión y los datos del usuario
        setToken(data.access_token);
        localStorage.setItem("id_user", data.id_user);
        localStorage.setItem("nombre", data.nombre);
        localStorage.setItem("apellido", data.apellido);
        localStorage.setItem("mail", data.mail);
        localStorage.setItem("id_rol", data.id_rol);
        localStorage.setItem("id_client", data.id_client);

        // Verificar si necesita 2FA
        const deviceId = getDeviceId();
        const check2fa = await apiFetch("/users/2fa/check", {
          method: "POST",
          body: JSON.stringify({ mail: normalizedMail, device_id: deviceId }),
        });

        if (check2fa.ok) {
          const check2faResult = await check2fa.json();
          const check2faData = check2faResult.data || check2faResult;
          if (check2faData.requires_2fa) {
            const send2faResponse = await apiFetch("/users/2fa/send", {
              method: "POST",
              body: JSON.stringify({ mail: normalizedMail, device_id: deviceId }),
            });
            const send2faResult = await send2faResponse.json();
            if (!send2faResponse.ok || !send2faResult.success) {
              setError(send2faResult.message || "No se pudo enviar el código de verificación");
              return;
            }
            navigate("/verificacion", { state: { mail: normalizedMail }, replace: true });
          } else {
            navigate("/seleccion-proyecto", { replace: true });
          }
        } else {
          navigate("/seleccion-proyecto", { replace: true });
        }
      } else {
        const detail = Array.isArray(result.detail)
          ? result.detail.map((item) => item.msg).join(", ")
          : result.detail;
        setError(detail || result.message || result.error || "Correo o contraseña incorrectos");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (registro.contrasena !== registro.confirmarContrasena) {
      setError("Las contraseñas no coinciden");
      return;
    }

    const reglasFaltantes = validarContrasena(registro.contrasena);
    if (reglasFaltantes.length > 0) {
      setError("La contraseña debe tener: " + reglasFaltantes.join(", "));
      return;
    }

    if (!aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones");
      return;
    }

    setLoading(true);

    try {
      const { confirmarContrasena, ...datosEnviar } = registro;
      const response = await apiFetch("/register", {
        method: "POST",
        body: JSON.stringify(datosEnviar),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const data = result.data;

        // Guardar el token de sesión y los datos del usuario registrado
        setToken(data.access_token);
        localStorage.setItem("id_user", data.id_user);
        localStorage.setItem("nombre", data.nombre);
        localStorage.setItem("apellido", data.apellido);
        localStorage.setItem("mail", data.mail);
        localStorage.setItem("id_client", data.id_cliente);

        // Siempre ir a registrar proyecto.
        navigate("/registro-proyecto");
      } else {
        const detail = Array.isArray(result.detail)
          ? result.detail.map((item) => item.msg).join(", ")
          : result.detail;
        setError(detail || result.message || result.error || "Error al registrar");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistroChange = (e) => {
    setRegistro({ ...registro, [e.target.name]: e.target.value });
  };
  // Para poder ver la contraseña que estoy escribiendo en el login
  const [verContrasena, setVerContrasena] = useState(false);

  // Para poder ver la contraseña que estoy escribiendo en el registro
  const [verContrasenaReg, setVerContrasenaReg] = useState(false);
  const [verConfirmarReg, setVerConfirmarReg] = useState(false);

  return (
    <div className="login-page">
      {/* Fondo con imagen */}
      <div
        className="login-page__bg"
        style={{ backgroundImage: `url(${claqueta})` }}
      />
      <div className="login-page__overlay" />

      <div className={`login-card-wrapper ${activeTab === "registrar" ? "login-card-wrapper--wide" : ""}`}>
        {/* Logo */}
        <div className="login-logo">
          <img src={logo} alt="Logo" className="login-logo__img" />
        </div>

        {/* Card */}
        <div className="login-card">
          {/* Tabs */}
          <div className="login-tabs">
            <button
              onClick={() => { setActiveTab("ingresar"); setError(""); }}
              className={`login-tab ${activeTab === "ingresar" ? "login-tab--active" : ""}`}
            >
              Ingresar
            </button>
            <button
              onClick={() => { setActiveTab("registrar"); setError(""); }}
              className={`login-tab ${activeTab === "registrar" ? "login-tab--active" : ""}`}
            >
              Registrar
            </button>
          </div>

          {/* Content */}
          <div className="login-content">
            {/* Mensaje de error */}
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {activeTab === "ingresar" ? (
              <form onSubmit={handleLogin} className="login-form">
                <div className="field">
                  <label className="field__label">E-mail</label>
                  <input
                    type="email"
                    value={mail}
                    onChange={(e) => setMail(e.target.value)}
                    className="field__input"
                    placeholder="Ingresa tu correo"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field__label">Contraseña</label>
                  <div className="field--password">
                    <input
                      type={verContrasena ? "text" : "password"}
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      className="field__input field__input--icon"
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerContrasena(!verContrasena)}
                      className="field__toggle"
                    >
                      {verContrasena ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </button>

                <div className="login-forgot">
                  <button
                    type="button"
                    onClick={() => navigate("/recuperar-acceso")}
                    className="login-forgot__btn"
                  >
                    <KeyRound size={14} className="login-forgot__icon" />
                    <span>¿Olvidaste tu contraseña o usuario?</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="login-form">
                {/* Sección: Datos de la Empresa */}
                <div>
                  <h3 className="form-section-title">
                    Información de la Empresa
                  </h3>
                  <div className="form-grid">
                    <div className="field">
                      <label className="field__label">Razón Social</label>
                      <input
                        type="text"
                        name="razon_social"
                        value={registro.razon_social}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="Nombre de la empresa"
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Representante Legal</label>
                      <input
                        type="text"
                        name="representante_legal"
                        value={registro.representante_legal}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="Nombre del representante"
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Documento</label>
                      <select
                        name="document"
                        value={registro.document}
                        onChange={handleRegistroChange}
                        className="field__input"
                        required
                      >
                        <option value="">Selecciona tipo</option>
                        <option value="CC">CC</option>
                        <option value="TI">TI</option>
                        <option value="NIT">NIT</option>
                        <option value="CE">CE</option>
                        <option value="PA">PA</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="field__label">Nº Documento</label>
                      <input
                        type="text"
                        name="id_document"
                        value={registro.id_document}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="Número de documento"
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Email Empresa</label>
                      <input
                        type="email"
                        name="email_empresa"
                        value={registro.email_empresa}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="correo@empresa.com"
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Dirección</label>
                      <input
                        type="text"
                        name="address"
                        value={registro.address}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="Dirección de la empresa"
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Teléfono</label>
                      <input
                        type="tel"
                        name="telephone"
                        value={registro.telephone}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="Teléfono fijo"
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Celular Empresa</label>
                      <input
                        type="tel"
                        name="number_cellphone"
                        value={registro.number_cellphone}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="Celular de la empresa"
                      />
                    </div>
                  </div>
                </div>

                {/* Separador */}
                <div className="divider"></div>

                {/* Sección: Datos del Administrador */}
                <div>
                  <h3 className="form-section-title">
                    Información de usuario
                  </h3>
                  <div className="form-grid">
                    <div className="field">
                      <label className="field__label">Nombres</label>
                      <input
                        type="text"
                        name="nombre"
                        value={registro.nombre}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="Ingresa tus nombres"
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Apellidos</label>
                      <input
                        type="text"
                        name="apellido"
                        value={registro.apellido}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="Ingresa tus apellidos"
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Email Personal</label>
                      <input
                        type="email"
                        name="mail"
                        value={registro.mail}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="tu@correo.com"
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Celular</label>
                      <input
                        type="tel"
                        name="msisdn"
                        value={registro.msisdn}
                        onChange={handleRegistroChange}
                        className="field__input"
                        placeholder="Tu número de celular"
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="field__label">Contraseña</label>
                      <div className="field--password">
                        <input
                          type={verContrasenaReg ? "text" : "password"}
                          name="contrasena"
                          value={registro.contrasena}
                          onChange={handleRegistroChange}
                          className="field__input field__input--icon"
                          placeholder="Crea una contraseña"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setVerContrasenaReg(!verContrasenaReg)}
                          className="field__toggle"
                        >
                          {verContrasenaReg ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <label className="field__label">Confirmar Contraseña</label>
                      <div className="field--password">
                        <input
                          type={verConfirmarReg ? "text" : "password"}
                          name="confirmarContrasena"
                          value={registro.confirmarContrasena}
                          onChange={handleRegistroChange}
                          className="field__input field__input--icon"
                          placeholder="Confirma tu contraseña"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setVerConfirmarReg(!verConfirmarReg)}
                          className="field__toggle"
                        >
                          {verConfirmarReg ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requisitos de contraseña */}
                {registro.contrasena && (
                  <div className="password-requirements">
                    <p className="password-requirements__title">La contraseña debe tener:</p>
                    <div className="password-requirements__grid">
                      {[
                        { label: "Mínimo 8 caracteres", valid: registro.contrasena.length >= 8 },
                        { label: "Una letra minúscula", valid: /[a-z]/.test(registro.contrasena) },
                        { label: "Una letra mayúscula", valid: /[A-Z]/.test(registro.contrasena) },
                        { label: "Un número", valid: /[0-9]/.test(registro.contrasena) },
                        { label: "Un carácter especial", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(registro.contrasena) },
                      ].map((regla) => (
                        <p key={regla.label} className={`requirement ${regla.valid ? "requirement--valid" : ""}`}>
                          {regla.valid ? "✓" : "○"} {regla.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Términos y condiciones */}
                <div className="terms">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="terms__checkbox"
                  />
                  <label className="terms__label">
                    Acepto los <span className="terms__link">Términos y Condiciones</span> y autorizo el tratamiento de mis datos personales conforme a la <span className="terms__link">Política de Privacidad</span>.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? "Registrando..." : "Registrar"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
