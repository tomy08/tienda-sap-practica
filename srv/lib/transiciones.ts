import type { Pedido } from '#cds-models/tienda'

// El tipo Estado sale del modelo: si agregás un estado en el .cds, aparece acá solo
export type Estado = NonNullable<Pedido['estado']>

export type Accion = 'enviar' | 'entregar' | 'cancelar' | 'devolver'

type Transicion = { desde: Estado[]; hacia: Estado }

// Record<Accion, ...> obliga a definir las cuatro acciones, ni una más ni una menos
export const TRANSICIONES: Record<Accion, Transicion> = {
  enviar: { desde: ['Nuevo'], hacia: 'Enviado' },
  entregar: { desde: ['Enviado'], hacia: 'Entregado' },
  cancelar: { desde: ['Nuevo'], hacia: 'Cancelado' },
  devolver: { desde: ['Enviado'], hacia: 'Nuevo' },
}

export function esAccion(valor: string): valor is Accion {
  return valor in TRANSICIONES
}

export function transicionPermitida(
  accion: string,
  estadoActual?: Estado | null,
): boolean {
  if (!esAccion(accion) || !estadoActual) return false
  return TRANSICIONES[accion].desde.includes(estadoActual)
}
