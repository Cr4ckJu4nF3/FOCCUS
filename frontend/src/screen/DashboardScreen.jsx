import logo from "../assets/Logo_Negativo.png";

export default function DashboardScreen() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img src={logo} alt="Logo" className="h-12" />
          <h2 className="text-[#FAFAFA]">Dashboard</h2>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="bg-[#1A1A1A] rounded-lg shadow-lg border border-[#2A2A2A] p-12 text-center">
          <h1 className="text-[#FAFAFA] mb-4">
            Bienvenido al Sistema de Continuidad Visual
          </h1>
          <p className="text-[#6B6B6B]">
            Tu proyecto ha sido registrado exitosamente
          </p>
        </div>
      </main>
    </div>
  );
}
