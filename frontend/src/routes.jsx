import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "./screen/Login";
import TwoFactor from "./screen/TwoFactor";
import CompleteInvitation from "./screen/CompleteInvitation";
import ForgotPassword from "./screen/ForgotPassword";
import ProjectSelection from "./screen/ProjectSelection";
import ProjectDashboard from "./screen/ProjectDashboard";
import AdminDashboard from "./screen/AdminDashboard";
import Clients from "./screen/Clients";
import Profile from "./screen/Profile";
import Dashboard from "./screen/Dashboard";
import Landing from "./screen/Landing";
import Roles from "./screen/Roles";
import Guion from "./screen/Guion";
import Escena from "./screen/Escena";
import Rodaje from "./screen/Rodaje";
import Desglose from "./screen/Desglose";
import Galeria from "./screen/Galeria";
import BuscarCodigo from "./screen/BuscarCodigo";
import ProtectedRoute from "./screen/ProtectedRoute";
import ModuleLayout from "./componentes/ModuleLayout";

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
    path: "/completar-cuenta",
    element: <ProtectedRoute><CompleteInvitation /></ProtectedRoute>,
  },

  {
    path: "/recuperar-acceso",
    Component: ForgotPassword,
  },
  {
    path: "/registro-proyecto",
    element: <ProtectedRoute><ProjectSelection /></ProtectedRoute>,
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
    path: "/admin-dashboard",
    element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>,
  },
  {
    path: "/clientes",
    element: <ProtectedRoute><Clients /></ProtectedRoute>,
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
    element: <ProtectedRoute><ModuleLayout /></ProtectedRoute>,
    children: [
      { path: "/roles", element: <Roles /> },
      { path: "/guion", element: <Guion /> },
      { path: "/escenas", element: <Escena /> },
      { path: "/personajes", element: <Navigate to="/galeria" replace /> },
      { path: "/rodaje", element: <Rodaje /> },
      { path: "/desglose", element: <Desglose /> },
      { path: "/buscar-codigo", element: <BuscarCodigo /> },
      { path: "/galeria", element: <Galeria /> },
    ],
  },
]);