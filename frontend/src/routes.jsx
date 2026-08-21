import { createBrowserRouter } from "react-router-dom";
import Login from "./screen/Login";
import TwoFactor from "./screen/TwoFactor";
import ForgotPassword from "./screen/ForgotPassword";
import ProjectRegistration from "./screen/ProjectRegistration";
import ProjectSelection from "./screen/ProjectSelection";
import ProjectDashboard from "./screen/ProjectDashboard";
import Profile from "./screen/Profile";
import Dashboard from "./screen/Dashboard";
import Landing from "./screen/Landing";
import Roles from "./screen/Roles";
import ProtectedRoute from "./screen/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/login",
    Component: Login,
  },

  {
    path: "/verificacion",
    element: <ProtectedRoute><TwoFactor /></ProtectedRoute>,
  },

  {
    path: "/recuperar-acceso",
    Component: ForgotPassword,
  },
  {
    path: "/registro-proyecto",
    element: <ProtectedRoute><ProjectRegistration /></ProtectedRoute>,
  },
  {
    path: "/seleccion-proyecto",
    element: <ProtectedRoute><ProjectSelection /></ProtectedRoute>,
  },
  {
    path: "/proyecto-dashboard",
    element: <ProtectedRoute><ProjectDashboard /></ProtectedRoute>,
  },
  {
    path: "/perfil",
    element: <ProtectedRoute><Profile /></ProtectedRoute>,
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
  },
  {
    path: "/roles",
    element: <ProtectedRoute><Roles /></ProtectedRoute>,
  },
]);