# T6: nombres de lugares que empiezan por INT o EXT

Fecha de ejecución: 2026-11-21. Base: `9126d8f0ab691ee7b6fd5c33c76e725ae3d8e85a`.
Entorno: Windows, Node 24.16.0 y npm 11.13.0; sin API ni base de datos.

## Detectar

El analizador aceptaba `INT` o `EXT` sin comprobar dónde termina la
abreviatura. Por eso interpretaba el encabezado `INTERNADO - DÍA` como modo
interior y ubicación `ERNADO`. Al abrir y aplicar el formulario podía
modificar el lugar escrito por el usuario. La prueba también cubre
`EXTERIOR DEL TEATRO`.

Se agregó `frontend/src/utils/guionPrefijoPalabra.test.js` sobre la base, antes
de cambiar el código. Desde `frontend`, `node --test
src/utils/guionPrefijoPalabra.test.js` terminó con código 1:

```text
tests 1, pass 0, fail 1
actual:   modo_vista: 'Int', ubicacion: 'ERNADO'
esperado: modo_vista: '', ubicacion: 'INTERNADO'
```

## Corregir y verificar

El analizador exige que las abreviaturas terminen en punto, espacio o fin
de texto. Se añadió además una prueba que mantiene formatos ya admitidos
con y sin punto. No cambia endpoints, permisos ni esquema.

Reejecución del comando: código 0, `tests 2, pass 2, fail 0` (incluye la
prueba adicional de compatibilidad). `npm test`: código 0, `tests 18,
pass 18, fail 0`. `npm run build`: código 0; Vite advirtió sobre paquetes
mayores a 500 kB. ESLint sobre `guionEscenas.js` y la prueba nueva: código 0.

## Reproducir ambos estados

En un worktree temporal y limpio creado desde el commit base, traer **solo la
prueba** de `fix/t6-ciclo-b`, ejecutarla, traer luego solo la implementación
de esa rama y repetir:

```powershell
git restore --source fix/t6-ciclo-b -- frontend/src/utils/guionPrefijoPalabra.test.js
Set-Location frontend
node --test src/utils/guionPrefijoPalabra.test.js
Set-Location ..
git restore --source fix/t6-ciclo-b -- frontend/src/utils/guionEscenas.js
Set-Location frontend
node --test src/utils/guionPrefijoPalabra.test.js
```

El primer fallo y el segundo éxito deben observarse antes de hacer cualquier
otra modificación en ese worktree. La prueba de compatibilidad fue añadida
después de detectar el defecto, por eso el número total de casos cambia.

## Alcance del requisito 14

En la base y esta rama, `npm run lint` falló con 14 errores y 0 advertencias
en `Escena`, `Landing`, `Profile`, `ProjectRegistration` y
`ProjectSelection`; no se ha evaluado su criticidad individual. En la base,
la primera ejecución de `npm test` en paralelo mostró un fallo en la prueba
de galería y quedó bloqueada; se interrumpió. Una segunda ejecución serial
(`node --test --test-concurrency=1 src/utils/*.test.js`) pasó 16/16. No se
identificó una referencia verificable de T5, así que no se puede certificar
ausencia de regresiones respecto a T5. No se ejecutó una prueba de navegador.
