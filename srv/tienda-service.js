import cds from '@sap/cds'

export default class TiendaService extends cds.ApplicationService {
  init() {
    this.before('CREATE', 'Pedidos', this.completarPrecios)
    this.before(['UPDATE', 'DELETE'], 'Pedidos', this.bloquearPedidoEntregado)
    this.before(
      ['UPDATE', 'DELETE'],
      'PedidoItems',
      this.bloquearItemDePedidoEntregado,
    )
    return super.init()
  }

  async completarPrecios(req) {
    const { Productos } = cds.entities('tienda')
    const items = req.data.items ?? []

    // 1. Leer los precios de todos los productos del pedido en UNA consulta
    const ids = items.map((item) => item.producto_ID)
    const productos = await SELECT.from(Productos)
      .columns('ID', 'precio')
      .where({ ID: { in: ids } })
    const precioDe = Object.fromEntries(
      productos.map((p) => [p.ID, Number(p.precio)]),
    )

    // 2. Completar el precio de cada ítem y acumular el total
    let total = 0
    for (const item of items) {
      const precio = precioDe[item.producto_ID]
      if (precio === undefined)
        return req.reject(400, `El producto ${item.producto_ID} no existe`)
      item.precio = precio // pisa cualquier precio que mande el cliente
      total += precio * item.cantidad
    }
    req.data.total = total // ídem con el total
  }

  async bloquearPedidoEntregado(req) {
    const pedido = await SELECT.one.from(req.subject).columns('estado')
    if (!pedido) return req.reject(404, 'El pedido no existe')
    if (pedido.estado === 'Entregado')
      req.reject(409, 'Un pedido entregado no se puede modificar ni borrar')
  }

  async bloquearItemDePedidoEntregado(req) {
    const item = await SELECT.one
      .from(req.subject)
      .columns('pedido.estado as estado')
    if (!item) return req.reject(404, 'El ítem no existe')
    if (item.estado === 'Entregado')
      req.reject(409, 'No se pueden modificar ítems de un pedido entregado')
  }
}
