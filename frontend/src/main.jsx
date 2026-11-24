import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'
import App from './App.jsx'
import './desing/VidrioExperimental.css'
import './desing/Interacciones.css'
import './desing/VidrioUsuario.css'
import './desing/TemaCorrecciones.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
