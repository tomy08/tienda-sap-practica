import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import cds from '@sap/cds'

// Devuelve { status, data } tanto si la request sale bien como si falla.
// cds.test lanza una excepción con los errores 4xx/5xx; así los tratamos igual.
async function llamar(request: Promise<any>) {
  try {
    const { status, data } = await request
    return { status, data }
  } catch (error: any) {
    return {
      status: error.response?.status ?? error.status,
      data: error.response?.data,
    }
  }
}

describe('TiendaService', () => {
  const test = cds.test(import.meta.dirname + '/..') // levanta el proyecto
  const { GET, POST, PATCH } = test
  const base = '/odata/v4/tienda'
  const avisos = '/odata/v4/notificaciones/Notificaciones'

  // URL COMPLETA de un pedido (con draft, la clave incluye IsActiveEntity)
  const activo = (id: number) => `${base}/Pedidos(ID=${id},IsActiveEntity=true)`
  const borrador = (id: number) =>
    `${base}/Pedidos(ID=${id},IsActiveEntity=false)`

  // Crear un pedido = crear el borrador + activarlo (lo mismo que hace Fiori Elements).
  // Devuelve { status, data } de la activación; data.ID es el número asignado.
  async function crearPedido(datos: object) {
    const { data } = await POST(`${base}/Pedidos`, datos)
    return llamar(POST(`${borrador(data.ID)}/TiendaService.draftActivate`, {}))
  }

  beforeEach(() => test.data.reset()) // cada test arranca con los datos del CSV

  describe('Lecturas', () => {
    it('devuelve los productos cargados desde el CSV', async () => {
      const { status, data } = await GET(`${base}/Productos`)
      assert.equal(status, 200)
      assert.equal(data.value.length, 3)
    })
  })

  describe('Creación de pedidos', () => {
    it('numera el pedido y calcula precios y total en el servidor', async () => {
      const creado = await crearPedido({
        ID: 999,
        cliente_ID: 1,
        total: 1,
        estado: 'Entregado',
        items: [
          { pos: 1, producto_ID: 1, cantidad: 1, precio: 1 },
          { pos: 2, producto_ID: 2, cantidad: 3 },
        ],
      })
      assert.ok(creado.status < 300)
      assert.equal(creado.data.ID, 3) // el CSV tiene los pedidos 1 y 2; el 999 se ignora

      const { data } = await GET(`${activo(creado.data.ID)}?$expand=items`)
      assert.equal(Number(data.total), 295000) // 250.000 + 3 × 15.000
      assert.equal(data.estado, 'Nuevo') // @readonly + default
      const monitor = data.items.find((item: any) => item.pos === 1)
      assert.equal(Number(monitor.precio), 250000)
    })

    it('rechaza una cantidad fuera de rango al guardar', async () => {
      const { status } = await crearPedido({
        cliente_ID: 1,
        items: [{ pos: 1, producto_ID: 1, cantidad: 0 }],
      })
      assert.equal(status, 400) // el borrador se crea; falla al activarlo
    })

    it('no permite escribir ítems directamente', async () => {
      const { status } = await llamar(
        POST(`${base}/PedidoItems`, {
          pedido_ID: 1,
          pos: 3,
          producto_ID: 1,
          cantidad: 1,
        }),
      )
      assert.ok(status >= 400) // lo rechaza nuestro handler o la protección de draft
    })

    it('ignora cambios de stock desde la API', async () => {
      await llamar(PATCH(`${base}/Productos(3)`, { stock: 9999 }))
      const { data } = await GET(`${base}/Productos(3)`)
      assert.equal(data.stock, 1)
    })

    it('asigna las posiciones de los ítems en el servidor', async () => {
      const creado = await crearPedido({
        cliente_ID: 1,
        items: [
          { producto_ID: 1, cantidad: 1 },
          { producto_ID: 2, cantidad: 1 },
        ],
      })
      assert.ok(creado.status < 300)

      const { data } = await GET(`${activo(creado.data.ID)}?$expand=items`)
      const posiciones = data.items.map((item: any) => item.pos).sort()
      assert.deepEqual(posiciones, [1, 2])
    })
  })

  describe('Actions', () => {
    it('enviar cambia el estado y descuenta stock', async () => {
      const { status, data } = await llamar(
        POST(`${activo(1)}/TiendaService.enviar`, {}),
      )
      assert.equal(status, 200)
      assert.equal(data.estado, 'Enviado')

      const monitor = await GET(`${base}/Productos(1)`)
      const mouse = await GET(`${base}/Productos(2)`)
      assert.equal(monitor.data.stock, 3) // 5 - 2
      assert.equal(mouse.data.stock, 49) // 50 - 1
    })

    it('no permite enviar dos veces el mismo pedido', async () => {
      await POST(`${activo(1)}/TiendaService.enviar`, {})
      const { status } = await llamar(
        POST(`${activo(1)}/TiendaService.enviar`, {}),
      )
      assert.equal(status, 409)
    })

    it('si falta stock, no cambia nada (rollback)', async () => {
      // Preparar: pedido de 2 teclados, con 1 en stock
      const { data: nuevo } = await crearPedido({
        cliente_ID: 2,
        items: [{ pos: 1, producto_ID: 3, cantidad: 2 }],
      })

      // Ejecutar
      const { status } = await llamar(
        POST(`${activo(nuevo.ID)}/TiendaService.enviar`, {}),
      )
      assert.equal(status, 409)

      // Verificar: ni el estado ni el stock cambiaron
      const pedido = await GET(activo(nuevo.ID))
      const teclado = await GET(`${base}/Productos(3)`)
      assert.equal(pedido.data.estado, 'Nuevo')
      assert.equal(teclado.data.stock, 1)
    })

    it('devolver vuelve a Nuevo y repone el stock', async () => {
      await POST(`${activo(1)}/TiendaService.enviar`, {})
      const { status, data } = await llamar(
        POST(`${activo(1)}/TiendaService.devolver`, {}),
      )
      assert.equal(status, 200)
      assert.equal(data.estado, 'Nuevo')

      const monitor = await GET(`${base}/Productos(1)`)
      assert.equal(monitor.data.stock, 5)
    })

    it('cancelar exige un motivo', async () => {
      const { status } = await llamar(
        POST(`${activo(1)}/TiendaService.cancelar`, {}),
      )
      assert.equal(status, 400)
    })
  })

  describe('Functions', () => {
    it('totalPorCliente suma los pedidos del cliente', async () => {
      const { data } = await GET(`${base}/totalPorCliente(cliente=1)`)
      assert.equal(Number(data.value), 515000) // pedido 1 del CSV
    })
  })

  describe('Eventos', () => {
    it('enviar un pedido genera los avisos correspondientes', async () => {
      await POST(`${activo(1)}/TiendaService.enviar`, {})

      const { data } = await GET(avisos)
      const tipos = data.value.map((n: any) => n.tipo).sort()
      assert.deepEqual(tipos, ['PEDIDO_ENVIADO', 'STOCK_BAJO'])
    })

    it('un envío que falla no genera avisos', async () => {
      const { data: nuevo } = await crearPedido({
        cliente_ID: 2,
        items: [{ pos: 1, producto_ID: 3, cantidad: 2 }],
      })
      await llamar(POST(`${activo(nuevo.ID)}/TiendaService.enviar`, {}))

      const { data } = await GET(avisos)
      assert.equal(data.value.length, 0)
    })

    it('cancelar un pedido genera un aviso con el motivo', async () => {
      await POST(`${activo(1)}/TiendaService.cancelar`, {
        motivo: 'Cliente arrepentido',
      })

      const { data } = await GET(avisos)
      assert.equal(data.value.length, 1)
      assert.equal(data.value[0].tipo, 'PEDIDO_CANCELADO')
      assert.match(data.value[0].mensaje, /Cliente arrepentido/)
    })
  })
})
