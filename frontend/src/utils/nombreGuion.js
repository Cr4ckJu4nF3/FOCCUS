// Evita nombres evidentes ya cargados, sin garantizar unicidad en el servidor.
export function nombreProvisionalGuion(guiones) {
  const nombres = new Set(guiones.map((guion) => String(guion.nombre || "").trim().toLocaleLowerCase()));
  let numero = 1;
  while (nombres.has(`guion${String(numero).padStart(2, "0")}`)) numero += 1;
  return `Guion${String(numero).padStart(2, "0")}`;
}
