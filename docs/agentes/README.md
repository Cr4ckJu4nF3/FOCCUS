# Equipo de agentes de FOCCUS

Tres agentes de GitHub Copilot trabajan juntos. Sus definiciones están en `.github\agents\`.

| Agente | Archivo | Qué hace |
|---|---|---|
| **foccus-web** (principal) | `foccus-web.agent.md` | Desarrolla web: backend, frontend y base de datos. Maneja las ramas. |
| **foccus-investigador** | `foccus-investigador.agent.md` | Investiga en internet (formato de guion, Final Draft, uso real de plataformas) y recomienda a foccus-web. |
| **foccus-mobile** | `foccus-mobile.agent.md` | Adapta a Flutter lo que foccus-web termina, cuando el usuario lo pida. |

## Flujo de trabajo

```
Usuario ──idea──> investigador ──informe──> web ──cambios──> mobile (cuando el usuario lo pida)
                 (¿se puede? ¿cómo?)     (implementa)       (adapta)
```

1. El usuario propone algo. El **investigador** dice si se puede, cómo y qué dice la industria, y deja un informe en `docs\agentes\investigacion\`.
2. **foccus-web** lee el informe, implementa y anota el cambio en `CAMBIOS_WEB.md` (endpoints, pantallas, estado "pendiente" para móvil).
3. Cuando el usuario diga "adapta a mobile", **foccus-mobile** lee las entradas pendientes de `CAMBIOS_WEB.md`, las implementa en Flutter y las marca como "hecho en móvil".

## Archivos compartidos
- `docs\agentes\investigacion\` – informes del investigador (más un `README.md` índice).
- `docs\agentes\CAMBIOS_WEB.md` – registro de cambios del web para móvil.

## Cómo usarlos
En VS Code, abre el chat de Copilot y elige el agente en el selector (por nombre: `foccus-web`, `foccus-investigador`, `foccus-mobile`).
Ejemplos:
- *investigador:* "Investiga el formato estándar de guion de Final Draft y dime qué le falta a nuestro editor."
- *web:* "Implementa lo que recomendó el investigador sobre el formato de escena."
- *mobile:* "Adapta a móvil los cambios pendientes de CAMBIOS_WEB.md."
