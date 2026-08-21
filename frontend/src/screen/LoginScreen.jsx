import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import logo from "../assets/Logo.png";
import claqueta from "../assets/claqueta.jpg";
import API_URL, { getDeviceId } from "../api";



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
      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail, contrasena }),
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;

              // Guardar datos del usuario
        localStorage.setItem("id_user", data.id_user);
        localStorage.setItem("nombre", data.nombre);
        localStorage.setItem("apellido", data.apellido);
        localStorage.setItem("mail", data.mail);
        localStorage.setItem("id_rol", data.id_rol);
        localStorage.setItem("id_client", data.id_client);
        localStorage.setItem("id_rol", 1001);

        // Verificar si necesita 2FA
        const deviceId = getDeviceId();
        const check2fa = await fetch(`${API_URL}/users/2fa/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mail, device_id: deviceId }),
        });

        if (check2fa.ok) {
          const check2faResult = await check2fa.json();
          const check2faData = check2faResult.data || check2faResult;
          if (check2faData.requires_2fa) {
            await fetch(`${API_URL}/users/2fa/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mail, device_id: deviceId }),
            });
            navigate("/verificacion", { state: { mail }, replace: true });
          } else {
            navigate("/seleccion-proyecto", { replace: true });
          }
        } else {
          navigate("/seleccion-proyecto", { replace: true });
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || errorData.message || "Correo o contraseña incorrectos");
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
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosEnviar),
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;

        // Guardar datos del usuario registrado
        localStorage.setItem("id_user", data.id_user);
        localStorage.setItem("nombre", data.nombre);
        localStorage.setItem("apellido", data.apellido);
        localStorage.setItem("mail", data.mail);
        localStorage.setItem("id_client", data.id_cliente);

        // Siempre ir a registrar proyecto.
        navigate("/registro-proyecto");
      } else {
        const errorData = await response.json();
        setError(errorData.detail || errorData.message || "Error al registrar");
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
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Fondo con imagen */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${claqueta})` }}
      />
      <div className="absolute inset-0 bg-[#0A0A0A]/85" />

      <div className={`w-full transition-all ${activeTab === "registrar" ? "max-w-2xl" : "max-w-md"} mx-auto relative z-10`}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Logo" className="w-35 h-35" />
        </div>

        {/* Card */}
        <div className="bg-[#1A1A1A] rounded-lg shadow-lg overflow-hidden border border-[#2A2A2A]">
          {/* Tabs */}
          <div className="flex border-b border-[#2A2A2A]">
            <button
              onClick={() => { setActiveTab("ingresar"); setError(""); }}
              className={`flex-1 py-4 px-6 transition-all ${
                activeTab === "ingresar"
                  ? "bg-[#0B4F8A] text-white"
                  : "bg-[#1A1A1A] text-[#6B6B6B] hover:bg-[#2A2A2A]"
              }`}
            >
              Ingresar
            </button>
            <button
              onClick={() => { setActiveTab("registrar"); setError(""); }}
              className={`flex-1 py-4 px-6 transition-all ${
                activeTab === "registrar"
                  ? "bg-[#0B4F8A] text-white"
                  : "bg-[#1A1A1A] text-[#6B6B6B] hover:bg-[#2A2A2A]"
              }`}
            >
              Registrar
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Mensaje de error */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {activeTab === "ingresar" ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block mb-2 text-[#FAFAFA]">E-mail</label>
                  <input
                    type="email"
                    value={mail}
                    onChange={(e) => setMail(e.target.value)}
                    className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                    placeholder="Ingresa tu correo"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-2 text-[#FAFAFA]">Contraseña</label>
                  <div className="relative">
                    <input
                      type={verContrasena ? "text" : "password"}
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerContrasena(!verContrasena)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#FAFAFA] transition-colors"
                    >
                      {verContrasena ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0B4F8A] text-white py-3 rounded-lg hover:bg-[#094170] transition-colors disabled:opacity-50"
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </button>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate("/recuperar-acceso")}
                    className="flex items-center gap-1.5 text-[#6B6B6B] hover:text-[#0B4F8A] text-sm transition-colors group"
                  >
                    <KeyRound className="w-3.5 h-3.5 group-hover:text-[#0B4F8A] transition-colors" />
                    <span>¿Olvidaste tu contraseña o usuario?</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                {/* Sección: Datos de la Empresa */}
                <div>
                  <h3 className="text-[#0B4F8A] text-sm font-semibold mb-4">
                    Información de la Empresa
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Razón Social</label>
                      <input
                        type="text"
                        name="razon_social"
                        value={registro.razon_social}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="Nombre de la empresa"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Representante Legal</label>
                      <input
                        type="text"
                        name="representante_legal"
                        value={registro.representante_legal}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="Nombre del representante"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Documento</label>
                      <select
                        name="document"
                        value={registro.document}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
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
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Nº Documento</label>
                      <input
                        type="text"
                        name="id_document"
                        value={registro.id_document}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="Número de documento"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Email Empresa</label>
                      <input
                        type="email"
                        name="email_empresa"
                        value={registro.email_empresa}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="correo@empresa.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Dirección</label>
                      <input
                        type="text"
                        name="address"
                        value={registro.address}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="Dirección de la empresa"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Teléfono</label>
                      <input
                        type="tel"
                        name="telephone"
                        value={registro.telephone}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="Teléfono fijo"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Celular Empresa</label>
                      <input
                        type="tel"
                        name="number_cellphone"
                        value={registro.number_cellphone}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="Celular de la empresa"
                      />
                    </div>
                  </div>
                </div>

                {/* Separador */}
                <div className="border-t border-[#2A2A2A]"></div>

                {/* Sección: Datos del Administrador */}
                <div>
                  <h3 className="text-[#0B4F8A] text-sm font-semibold mb-4">
                    Información de usuario
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Nombres</label>
                      <input
                        type="text"
                        name="nombre"
                        value={registro.nombre}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="Ingresa tus nombres"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Apellidos</label>
                      <input
                        type="text"
                        name="apellido"
                        value={registro.apellido}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="Ingresa tus apellidos"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Email Personal</label>
                      <input
                        type="email"
                        name="mail"
                        value={registro.mail}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="tu@correo.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Celular</label>
                      <input
                        type="tel"
                        name="msisdn"
                        value={registro.msisdn}
                        onChange={handleRegistroChange}
                        className="w-full px-4 py-3 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                        placeholder="Tu número de celular"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Contraseña</label>
                      <div className="relative">
                        <input
                          type={verContrasenaReg ? "text" : "password"}
                          name="contrasena"
                          value={registro.contrasena}
                          onChange={handleRegistroChange}
                          className="w-full px-4 py-3 pr-12 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                          placeholder="Crea una contraseña"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setVerContrasenaReg(!verContrasenaReg)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#FAFAFA] transition-colors"
                        >
                          {verContrasenaReg ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-2 text-[#FAFAFA]">Confirmar Contraseña</label>
                      <div className="relative">
                        <input
                          type={verConfirmarReg ? "text" : "password"}
                          name="confirmarContrasena"
                          value={registro.confirmarContrasena}
                          onChange={handleRegistroChange}
                          className="w-full px-4 py-3 pr-12 border border-[#2A2A2A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F8A] bg-[#0A0A0A] text-[#FAFAFA]"
                          placeholder="Confirma tu contraseña"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setVerConfirmarReg(!verConfirmarReg)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#FAFAFA] transition-colors"
                        >
                          {verConfirmarReg ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requisitos de contraseña */}
                {registro.contrasena && (
                  <div className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                    <p className="text-[#6B6B6B] text-xs mb-2 font-semibold">La contraseña debe tener:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {[
                        { label: "Mínimo 8 caracteres", valid: registro.contrasena.length >= 8 },
                        { label: "Una letra minúscula", valid: /[a-z]/.test(registro.contrasena) },
                        { label: "Una letra mayúscula", valid: /[A-Z]/.test(registro.contrasena) },
                        { label: "Un número", valid: /[0-9]/.test(registro.contrasena) },
                        { label: "Un carácter especial", valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(registro.contrasena) },
                      ].map((regla) => (
                        <p key={regla.label} className={`text-xs flex items-center gap-1.5 ${regla.valid ? "text-green-400" : "text-[#6B6B6B]"}`}>
                          {regla.valid ? "✓" : "○"} {regla.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Términos y condiciones */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] accent-[#0B4F8A]"
                  />
                  <label className="text-[#6B6B6B] text-xs leading-relaxed">
                    Acepto los <span className="text-[#0B4F8A] hover:underline cursor-pointer">Términos y Condiciones</span> y autorizo el tratamiento de mis datos personales conforme a la <span className="text-[#0B4F8A] hover:underline cursor-pointer">Política de Privacidad</span>.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0B4F8A] text-white py-3 rounded-lg hover:bg-[#094170] transition-colors disabled:opacity-50"
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




