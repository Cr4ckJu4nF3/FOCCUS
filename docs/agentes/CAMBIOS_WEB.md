# Cambios del web pendientes de adaptar a móvil

foccus-web agrega aquí cada cambio relevante (arriba lo más nuevo). foccus-mobile los adapta cuando el usuario lo pida y cambia el estado a `hecho en móvil`.

Formato de cada entrada:

```
## AAAA-MM-DD – Título corto
- Rama/commit:
- Qué cambió (web/backend/BD):
- Endpoints nuevos o modificados (método, ruta, cuerpo, respuesta):
- Pantallas web afectadas:
- Estado para móvil: pendiente | hecho en móvil (fecha)
```

---

_Sin cambios registrados todavía._

## 2026-11-01 – Formato de guion (informe del investigador) – adaptado en móvil
- Origen: `investigacion\2026-11-01-formato-guion.md` (sección "Impacto en móvil").
- Hecho en móvil (rama `mobile`): lector con bloques de guion (escena, acción, personaje, paréntesis, diálogo, transición) en Courier Prime con sangrías proporcionales, tamaño de letra ajustable y "≈ N min"; menú "Bloque" en el editor; editor en Courier Prime.
- Limitación: el móvil reconoce los bloques por el texto (mayúsculas, `INT./EXT.`, `CORTE A:`), porque el web aún guarda el guion sin bloques tipados. Cuando foccus-web los implemente (`gb-*` o JSON), hay que cambiar `lib\models\guion_formato.dart`.
- Pendiente para foccus-web: estimación de minutos, PDF y portada desde el backend.
- Estado para móvil: hecho en móvil (2026-11-01), ajustar cuando el web tenga bloques tipados
