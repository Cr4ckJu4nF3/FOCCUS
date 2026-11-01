import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import ThemeToggle from "./componentes/ThemeToggle";
import AccesibilidadGlobal from "./componentes/AccesibilidadGlobal";

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ThemeToggle />
      <AccesibilidadGlobal />
    </>
  );
}

export default App;
