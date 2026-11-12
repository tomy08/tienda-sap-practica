import cds from '@sap/cds'
import { Notificaciones } from '#cds-models/tienda'

const LOG = cds.log('notificaciones')

export default class NotificacionesService extends cds.ApplicationService {
  async init() {
    const tienda = await cds.connect.to('TiendaService')

    tienda.on('PedidoEnviado', async (msg) => {
      const { pedido, cliente, total } = msg.data
      await INSERT.into(Notificaciones).entries({
        tipo: 'PEDIDO_ENVIADO',
        mensaje: `Pedido ${pedido} del cliente ${cliente} enviado por $${total}`,
      })
      LOG.info(`Aviso registrado: pedido ${pedido} enviado`)
    })

    tienda.on('StockBajo', async (msg) => {
      const { nombre, stock } = msg.data
      await INSERT.into(Notificaciones).entries({
        tipo: 'STOCK_BAJO',
        mensaje: `Quedan ${stock} unidades de ${nombre}: reponer`,
      })
      LOG.warn(`Stock bajo: ${nombre} (${stock})`)
    })

    tienda.on('PedidoCancelado', async (msg) => {
      const { pedido, motivo } = msg.data
      await INSERT.into(Notificaciones).entries({
        tipo: 'PEDIDO_CANCELADO',
        mensaje: `Pedido ${pedido} cancelado por ${motivo}`,
      })
      LOG.info(`Aviso registrado: pedido ${pedido} cancelado`)
    })

    return super.init()
  }
}
