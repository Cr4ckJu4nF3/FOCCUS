# T6: encabezado mixto I/E

Fecha de ejecución: 2026-11-21. Base: `9126d8f0ab691ee7b6fd5c33c76e725ae3d8e85a`.
Entorno: Windows, Node 24.16.0 y npm 11.13.0; sin API ni base de datos.

## Detectar

El clasificador del editor ya reconoce `I/E.` como escena, pero
`analizarEncabezadoEscena` no reconocía ese prefijo. Al abrir el formulario,
interpretaba `I/E. CASA` como ubicación y dejaba vacío el modo. Esto podía
deformar el encabezado al reconstruirlo.

Se agregó `frontend/src/utils/guionPrefijoMixto.test.js` sobre la base, antes
de cambiar el código. Desde `frontend`, `node --test
src/utils/guionPrefijoMixto.test.js` terminó con código 1:

```text
tests 1, pass 0, fail 1
actual:   modo_vista: '', ubicacion: 'I/E. CASA'
esperado: modo_vista: 'Int/Ext', ubicacion: 'CASA'
```

## Corregir y verificar

El analizador reconoce `I/E` como vista mixta y usa el formato existente
`INT./EXT.`. No cambia endpoints, permisos ni esquema.

Reejecución del mismo comando: código 0, `tests 1, pass 1, fail 0`.
`npm test`: código 0, `tests 17, pass 17, fail 0`.
`npm run build`: código 0; Vite advirtió sobre paquetes mayores a 500 kB.
ESLint sobre `guionEscenas.js` y la prueba nueva: código 0.

## Reproducir ambos estados

En un worktree temporal y limpio creado desde el commit base, traer **solo la
prueba** de `fix/t6-ciclo-a`, ejecutarla, traer luego solo la implementación
de esa rama y repetir:

```powershell
git restore --source fix/t6-ciclo-a -- frontend/src/utils/guionPrefijoMixto.test.js
Set-Location frontend
node --test src/utils/guionPrefijoMixto.test.js
Set-Location ..
git restore --source fix/t6-ciclo-a -- frontend/src/utils/guionEscenas.js
Set-Location frontend
node --test src/utils/guionPrefijoMixto.test.js
```

La prueba usa datos ficticios. El primer fallo y el segundo éxito deben
observarse antes de hacer cualquier otra modificación en ese worktree.

## Alcance del requisito 14

En la base y esta rama, `npm run lint` falló con 14 errores y 0 advertencias
en `Escena`, `Landing`, `Profile`, `ProjectRegistration` y
`ProjectSelection`; no se ha evaluado su criticidad individual. En la base,
la primera ejecución de `npm test` en paralelo mostró un fallo en la prueba
de galería y quedó bloqueada; se interrumpió. Una segunda ejecución serial
(`node --test --test-concurrency=1 src/utils/*.test.js`) pasó 16/16. No se
identificó una referencia verificable de T5, así que no se puede certificar
ausencia de regresiones respecto a T5. No se ejecutó una prueba de navegador.
