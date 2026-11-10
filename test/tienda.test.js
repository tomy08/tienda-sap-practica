import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import cds from '@sap/cds'

// Devuelve { status, data } tanto si la request sale bien como si falla.
// cds.test lanza una excepción con los errores 4xx/5xx; así los tratamos igual.
async function llamar(request) {
  try {
    const { status, data } = await request
    return { status, data }
  } catch (error) {
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

  beforeEach(() => test.data.reset()) // cada test arranca con los datos del CSV

  describe('Lecturas', () => {
    it('devuelve los productos cargados desde el CSV', async () => {
      const { status, data } = await GET(`${base}/Productos`)
      assert.equal(status, 200)
      assert.equal(data.value.length, 3)
    })
  })

  describe('Creación de pedidos', () => {
    it('calcula precios y total en el servidor, ignorando los del cliente', async () => {
      // Preparar + Ejecutar
      const creado = await llamar(
        POST(`${base}/Pedidos`, {
          ID: 10,
          cliente_ID: 1,
          total: 1,
          estado: 'Entregado',
          items: [
            { pos: 1, producto_ID: 1, cantidad: 1, precio: 1 },
            { pos: 2, producto_ID: 2, cantidad: 3 },
          ],
        }),
      )
      assert.equal(creado.status, 201)

      // Verificar leyendo lo que quedó guardado
      const { data } = await GET(`${base}/Pedidos(10)?$expand=items`)
      assert.equal(Number(data.total), 295000) // 250.000 + 3 × 15.000
      assert.equal(data.estado, 'Nuevo') // @readonly + default
      assert.equal(Number(data.items[0].precio), 250000)
    })

    it('rechaza una cantidad fuera de rango', async () => {
      const { status } = await llamar(
        POST(`${base}/Pedidos`, {
          ID: 11,
          cliente_ID: 1,
          items: [{ pos: 1, producto_ID: 1, cantidad: 0 }],
        }),
      )
      assert.equal(status, 400)
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
      assert.equal(status, 405)
    })
  })

  describe('Actions', () => {
    it('enviar cambia el estado y descuenta stock', async () => {
      const { status, data } = await llamar(
        POST(`${base}/Pedidos(1)/TiendaService.enviar`, {}),
      )
      assert.equal(status, 200)
      assert.equal(data.estado, 'Enviado')

      const monitor = await GET(`${base}/Productos(1)`)
      const mouse = await GET(`${base}/Productos(2)`)
      assert.equal(monitor.data.stock, 3) // 5 - 2
      assert.equal(mouse.data.stock, 49) // 50 - 1
    })

    it('no permite enviar dos veces el mismo pedido', async () => {
      await POST(`${base}/Pedidos(1)/TiendaService.enviar`, {})
      const { status } = await llamar(
        POST(`${base}/Pedidos(1)/TiendaService.enviar`, {}),
      )
      assert.equal(status, 409)
    })

    it('si falta stock, no cambia nada (rollback)', async () => {
      // Preparar: pedido de 2 teclados, con 1 en stock
      await POST(`${base}/Pedidos`, {
        ID: 40,
        cliente_ID: 2,
        items: [{ pos: 1, producto_ID: 3, cantidad: 2 }],
      })

      // Ejecutar
      const { status } = await llamar(
        POST(`${base}/Pedidos(40)/TiendaService.enviar`, {}),
      )
      assert.equal(status, 409)

      // Verificar: ni el estado ni el stock cambiaron
      const pedido = await GET(`${base}/Pedidos(40)`)
      const teclado = await GET(`${base}/Productos(3)`)
      assert.equal(pedido.data.estado, 'Nuevo')
      assert.equal(teclado.data.stock, 1)
    })

    it('cancelar exige un motivo', async () => {
      const { status } = await llamar(
        POST(`${base}/Pedidos(1)/TiendaService.cancelar`, {}),
      )
      assert.equal(status, 400)
    })
  })

  describe('Functions', () => {
    it('totalPorCliente suma los pedidos del cliente', async () => {
      const { data } = await GET(`${base}/totalPorCliente(cliente=1)`)
      assert.equal(Number(data), 515000) // pedido 1 del CSV
    })
  })
})
