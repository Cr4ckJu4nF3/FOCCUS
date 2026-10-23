import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import ThemeToggle from "./componentes/ThemeToggle";

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ThemeToggle />
    </>
  );
}

export default App;
