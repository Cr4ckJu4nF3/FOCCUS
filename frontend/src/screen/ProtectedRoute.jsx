import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const idUser = localStorage.getItem("id_user");
  
  if (!idUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}