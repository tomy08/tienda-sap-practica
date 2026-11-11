import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { transicionPermitida } from '../srv/lib/transiciones.ts'

describe('Transiciones de estado', () => {
  it('permite enviar un pedido Nuevo', () => {
    assert.equal(transicionPermitida('enviar', 'Nuevo'), true)
  })

  it('no permite entregar un pedido que no fue enviado', () => {
    assert.equal(transicionPermitida('entregar', 'Nuevo'), false)
  })

  it('no permite ninguna acción sobre un pedido Entregado', () => {
    for (const accion of ['enviar', 'entregar', 'cancelar', 'devolver']) {
      assert.equal(
        transicionPermitida(accion, 'Entregado'),
        false,
        `${accion} no debería estar permitida`,
      )
    }
  })

  it('rechaza acciones que no existen', () => {
    assert.equal(transicionPermitida('teletransportar', 'Nuevo'), false)
  })
})
