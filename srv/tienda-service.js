import cds from '@sap/cds'

import { TRANSICIONES, transicionPermitida } from './lib/transiciones.js'

const LOG = cds.log('tienda')

// Cambia el estado si el actual está entre los permitidos. Devuelve el ID del pedido.
async function cambiarEstado(req, accion, otrosCambios = {}) {
  const { hacia } = TRANSICIONES[accion]
  const pedido = await SELECT.one.from(req.subject).columns('ID', 'estado')
  if (!pedido) return req.reject(404, 'PEDIDO_NO_EXISTE')
  if (!transicionPermitida(accion, pedido.estado)) {
    return req.reject(409, 'TRANSICION_INVALIDA', [pedido.estado, hacia])
  }
  await UPDATE(req.subject).with({ estado: hacia, ...otrosCambios })
  return pedido.ID
}
// Descuenta el stock de cada ítem. Si algún producto no alcanza, rechaza todo.
async function descontarStock(req, pedidoID) {
  const { PedidoItems, Productos } = cds.entities('tienda')
  const items = await SELECT.from(PedidoItems)
    .columns('producto_ID', 'cantidad')
    .where({ pedido_ID: pedidoID })

  const sinStock = []
  for (const item of items) {
    const filas = await UPDATE(Productos, item.producto_ID)
      .with`stock = stock - ${item.cantidad}`.where`stock >= ${item.cantidad}`
    if (filas === 0) sinStock.push(item.producto_ID)
  }
  if (sinStock.length > 0) req.reject(409, 'SIN_STOCK', [sinStock.join(', ')])
}

// Suma los totales de un cliente, sin contar cancelados.
async function totalPedidosCliente(cliente) {
  const { Pedidos } = cds.entities('tienda')
  const resultado = await SELECT.one
    .from(Pedidos)
    .columns('sum(total) as total')
    .where`cliente_ID = ${cliente} and estado != 'Cancelado'`
  return Number(resultado?.total ?? 0)
}

async function reponerStock(pedidoID) {
  const { PedidoItems, Productos } = cds.entities('tienda')
  const items = await SELECT.from(PedidoItems)
    .columns('producto_ID', 'cantidad')
    .where({ pedido_ID: pedidoID })
  for (const item of items) {
    await UPDATE(Productos, item.producto_ID)
      .with`stock = stock + ${item.cantidad}`
  }
}

const pedidoActual = (req) => SELECT.one.from(req.subject)

export default class TiendaService extends cds.ApplicationService {
  init() {
    // CRUD
    this.before(['CREATE', 'UPDATE'], 'Pedidos', this.completarPrecios)
    this.before(['UPDATE', 'DELETE'], 'Pedidos', this.soloPedidosNuevos)
    this.before(
      ['CREATE', 'UPDATE', 'DELETE'],
      'PedidoItems',
      this.soloDesdeElPedido,
    )

    // Actions
    this.on('enviar', 'Pedidos', async (req) => {
      const pedidoID = await cambiarEstado(req, 'enviar')
      await descontarStock(req, pedidoID) // si falla, también se deshace el cambio de estado
      LOG.info(`Pedido ${pedidoID} enviado`)
      return pedidoActual(req)
    })

    this.on('entregar', 'Pedidos', async (req) => {
      await cambiarEstado(req, 'entregar')
      return pedidoActual(req)
    })

    this.on('cancelar', 'Pedidos', async (req) => {
      const { motivo } = req.data
      if (!motivo?.trim()) return req.reject(400, 'MOTIVO_OBLIGATORIO')
      await cambiarEstado(req, 'cancelar', { motivoCancelacion: motivo })
      return pedidoActual(req)
    })

    this.on('devolver', 'Pedidos', async (req) => {
      const pedidoID = await cambiarEstado(req, 'devolver')
      await reponerStock(pedidoID)
      LOG.info(`Pedido ${pedidoID} devuelto`)
      return pedidoActual(req)
    })

    // Function
    this.on('totalPorCliente', (req) => totalPedidosCliente(req.data.cliente))

    return super.init()
  }

  async completarPrecios(req) {
    if (req.event === 'UPDATE' && req.data.items === undefined) return

    const items = req.data.items ?? []
    if (items.length === 0) {
      req.data.total = 0
      return
    }

    const { Productos } = cds.entities('tienda')
    const ids = items.map((item) => item.producto_ID)
    const productos = await SELECT.from(Productos)
      .columns('ID', 'precio')
      .where({ ID: { in: ids } })
    const precioDe = Object.fromEntries(
      productos.map((p) => [p.ID, Number(p.precio)]),
    )

    let total = 0
    for (const item of items) {
      const precio = precioDe[item.producto_ID]
      if (precio === undefined) {
        req.error(400, 'PRODUCTO_NO_EXISTE', [item.producto_ID]) // anota y sigue revisando
        continue
      }
      item.precio = precio
      total += precio * item.cantidad
    }
    req.data.total = total
  }

  async soloPedidosNuevos(req) {
    const pedido = await SELECT.one.from(req.subject).columns('estado')
    if (!pedido) return req.reject(404, 'PEDIDO_NO_EXISTE')
    if (pedido.estado !== 'Nuevo')
      req.reject(409, 'PEDIDO_NO_EDITABLE', [pedido.estado])
  }

  soloDesdeElPedido(req) {
    req.reject(405, 'ITEMS_SOLO_DESDE_PEDIDO')
  }
}
