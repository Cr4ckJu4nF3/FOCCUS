import { Navigate, useLocation } from "react-router-dom";
import { isTokenValid } from "../api";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const isTwoFactorVerification = location.pathname === "/verificacion" && Boolean(location.state?.mail);
  const isInvitationCompletion = location.pathname === "/completar-cuenta";
  const needsProfileCompletion = localStorage.getItem("needs_profile_completion") === "true";

  if (needsProfileCompletion && !isTwoFactorVerification && !isInvitationCompletion) {
    return <Navigate to="/completar-cuenta" replace />;
  }

  if (!isTwoFactorVerification && !isTokenValid()) {
    return <Navigate to="/" replace />;
  }

  return children;
}
