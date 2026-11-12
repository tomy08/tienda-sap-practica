import cds from '@sap/cds'
import { Pedidos, totalPorCliente } from '#cds-models/TiendaService'
import {
  Productos,
  PedidoItems,
  Pedidos as PedidosDB,
} from '#cds-models/tienda'
import type { Pedido } from '#cds-models/tienda'
import {
  TRANSICIONES,
  transicionPermitida,
  type Accion,
} from './lib/transiciones.ts'

const LOG = cds.log('tienda')

const UMBRAL_STOCK = 3
type ProductoStockBajo = { producto: number; nombre: string; stock: number }

// ---------- Funciones auxiliares ----------

// Aplica una transición de la tabla. Devuelve el ID del pedido.
async function cambiarEstado(
  req: cds.Request,
  accion: Accion,
  otrosCambios: Partial<Pedido> = {},
) {
  const { hacia } = TRANSICIONES[accion]
  const pedido = await SELECT.one.from(req.subject).columns('ID', 'estado')
  if (!pedido) return req.reject(404, 'PEDIDO_NO_EXISTE')
  if (!transicionPermitida(accion, pedido.estado)) {
    return req.reject(409, 'TRANSICION_INVALIDA', undefined, [
      pedido.estado,
      hacia,
    ])
  }
  await UPDATE(req.subject).with({ estado: hacia, ...otrosCambios })
  return pedido.ID
}

// Descuenta el stock de cada ítem. Si algún producto no alcanza, rechaza todo.
async function descontarStock(req: cds.Request, pedidoID: number) {
  const items = await SELECT.from(PedidoItems)
    .columns('producto_ID', 'cantidad')
    .where({ pedido_ID: pedidoID })

  const sinStock: string[] = []
  const stockBajo: ProductoStockBajo[] = []

  for (const item of items) {
    const filas = await UPDATE(Productos, item.producto_ID!)
      .with`stock = stock - ${item.cantidad}`.where`stock >= ${item.cantidad}`
    if (filas === 0) sinStock.push(String(item.producto_ID))

    const producto = await SELECT.one
      .from(Productos, item.producto_ID!)
      .columns('ID', 'nombre', 'stock')
    const stock = producto?.stock ?? 0
    if (producto && stock <= UMBRAL_STOCK) {
      stockBajo.push({
        producto: producto.ID!,
        nombre: producto.nombre ?? '',
        stock,
      })
    }
  }
  if (sinStock.length > 0)
    req.reject(409, 'SIN_STOCK', undefined, [sinStock.join(', ')])

  return stockBajo
}

// Devuelve al stock lo que tenía el pedido. Sumar nunca falla.
async function reponerStock(pedidoID: number) {
  const items = await SELECT.from(PedidoItems)
    .columns('producto_ID', 'cantidad')
    .where({ pedido_ID: pedidoID })

  for (const item of items) {
    await UPDATE(Productos, item.producto_ID!)
      .with`stock = stock + ${item.cantidad}`
  }
}

// Suma los totales de un cliente, sin contar cancelados.
async function totalPedidosCliente(cliente: number) {
  const resultado = await SELECT.one
    .from(PedidosDB)
    .columns('sum(total) as total')
    .where`cliente_ID = ${cliente} and estado != 'Cancelado'`
  return Number(resultado?.total ?? 0)
}

const pedidoActual = (req: cds.Request) => SELECT.one.from(req.subject)

// ---------- Servicio ----------

export default class TiendaService extends cds.ApplicationService {
  async init() {
    // CRUD de pedidos: completar precios y total
    this.before(['CREATE', 'UPDATE'], Pedidos, async (req) => {
      if (req.event === 'UPDATE' && req.data.items === undefined) return

      const items = req.data.items ?? []
      if (items.length === 0) {
        req.data.total = 0
        return
      }

      const ids = items.map((item) => item.producto_ID)
      const productos = await SELECT.from(Productos)
        .columns('ID', 'precio')
        .where({ ID: { in: ids } })
      const precioDe = new Map(
        productos.map((p): [number, number] => [p.ID!, Number(p.precio)]),
      )

      let total = 0
      for (const item of items) {
        // TypeScript nos obliga a contemplar que producto_ID y cantidad pueden venir vacíos
        const precio =
          item.producto_ID == null ? undefined : precioDe.get(item.producto_ID)
        if (precio === undefined) continue // @assert.target reporta el error
        item.precio = precio
        total += precio * (item.cantidad ?? 0)
      }
      req.data.total = total
    })

    // CRUD de pedidos: solo se editan o borran los Nuevos
    this.before(['UPDATE', 'DELETE'], Pedidos, async (req) => {
      const pedido = await SELECT.one.from(req.subject).columns('estado')
      if (!pedido) return req.reject(404, 'PEDIDO_NO_EXISTE')
      if (pedido.estado !== 'Nuevo')
        req.reject(409, 'PEDIDO_NO_EDITABLE', undefined, [pedido.estado])
    })

    // Ítems: solo a través del pedido (no usa datos, alcanza con el nombre)
    this.before(['CREATE', 'UPDATE', 'DELETE'], 'PedidoItems', (req) => {
      req.reject(405, 'ITEMS_SOLO_DESDE_PEDIDO')
    })

    // Actions
    this.on('enviar', 'Pedidos', async (req) => {
      const pedidoID = await cambiarEstado(req, 'enviar')
      const stockBajo = await descontarStock(req, pedidoID)
      const pedido = pedidoActual(req)

      await this.emit('PedidoEnviado', {
        pedido: pedidoID,
        cliente: (await pedido)?.cliente_ID,
        total: (await pedido)?.total,
      })
      for (const producto of stockBajo) {
        await this.emit('StockBajo', producto)
      }

      LOG.info(`Pedido ${pedidoID} enviado`)
      return pedido
    })

    this.on('entregar', 'Pedidos', async (req) => {
      await cambiarEstado(req, 'entregar')
      return pedidoActual(req)
    })

    this.on('cancelar', 'Pedidos', async (req) => {
      const { motivo } = req.data
      if (!motivo?.trim()) return req.reject(400, 'MOTIVO_OBLIGATORIO')

      const pedidoID = await cambiarEstado(req, 'cancelar', {
        motivoCancelacion: motivo,
      })
      await this.emit('PedidoCancelado', { pedido: pedidoID, motivo })

      LOG.info(`Pedido ${pedidoID} cancelado`)
      return pedidoActual(req) // leído DESPUÉS del cambio
    })

    this.on('devolver', 'Pedidos', async (req) => {
      const pedidoID = await cambiarEstado(req, 'devolver')
      await reponerStock(pedidoID)
      LOG.info(`Pedido ${pedidoID} devuelto`)
      return pedidoActual(req)
    })

    // Function (tipada: req.data.cliente es number | null)
    this.on(totalPorCliente, (req) => {
      const { cliente } = req.data
      if (cliente == null) return req.reject(400, 'CLIENTE_OBLIGATORIO')
      return totalPedidosCliente(cliente)
    })

    return super.init()
  }
}
