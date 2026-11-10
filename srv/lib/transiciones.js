// Todas las reglas de estados en un solo lugar
export const TRANSICIONES = {
  enviar: { desde: ['Nuevo'], hacia: 'Enviado' },
  entregar: { desde: ['Enviado'], hacia: 'Entregado' },
  cancelar: { desde: ['Nuevo'], hacia: 'Cancelado' },
  devolver: { desde: ['Enviado'], hacia: 'Nuevo' },
}

// Función pura: no lee base de datos, no tiene efectos secundarios
export function transicionPermitida(accion, estadoActual) {
  const transicion = TRANSICIONES[accion]
  return Boolean(transicion && transicion.desde.includes(estadoActual))
}
