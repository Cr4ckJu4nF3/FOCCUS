import { Navigate } from "react-router-dom";
import { isTokenValid } from "../api";

export default function ProtectedRoute({ children }) {
  if (!isTokenValid()) {
    return <Navigate to="/" replace />;
  }

  return children;
}
