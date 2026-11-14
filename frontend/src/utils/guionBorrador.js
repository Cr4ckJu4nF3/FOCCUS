// Comparar los datos completos también detecta cambios de formato y metadatos,
// no solo texto visible.
export function hayCambiosGuion({
  vista, editandoContenido, contenidoInicial, escenasActivo, escenasBorrador,
  ceroForm, versionForm, versionInicial, contenidoEditado, contenidoOriginal,
  cambiosEscenaPendientes, dialogoEscena, formEscena, escenaInicial,
}) {
  const escenaSinAplicar = dialogoEscena && JSON.stringify(formEscena) !== escenaInicial;
  const escenasPendientes = cambiosEscenaPendientes.length > 0;
  if (vista === "crear-cero" || vista === "crear-version") {
    const textoModificado = escenasActivo
      ? escenasBorrador.some((escena) => Boolean(escena.texto))
      : Boolean(contenidoInicial);
    const metadatosModificados = vista === "crear-cero"
      ? Boolean(ceroForm.nombre || ceroForm.descripcion)
      : JSON.stringify(versionForm) !== versionInicial;
    return textoModificado || metadatosModificados || escenasPendientes || escenaSinAplicar;
  }
  if (vista === "lector" && editandoContenido) {
    return contenidoEditado !== contenidoOriginal || escenasPendientes || escenaSinAplicar;
  }
  return false;
}
