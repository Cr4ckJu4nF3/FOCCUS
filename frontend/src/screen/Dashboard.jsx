import logo from "../assets/FoccusNB_White.png";
import "../desing/Dashboard.css";

export default function DashboardScreen() {
  return (
    <div className="ds-page">
      {/* Header */}
      <header className="ds-header">
        <div className="ds-header-inner">
          <img src={logo} alt="Logo" className="ds-logo" />
          <h2 className="ds-header-title">Dashboard</h2>
        </div>
      </header>

      {/* Content */}
      <main className="ds-main">
        <div className="ds-card">
          <h1 className="ds-card-title">
            Bienvenido al Sistema de Continuidad Visual
          </h1>
          <p className="ds-card-subtitle">
            Tu proyecto ha sido registrado exitosamente
          </p>
        </div>
      </main>
    </div>
  );
}
