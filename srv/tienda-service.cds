using { tienda as db } from '../db/schema';

service TiendaService {
  entity Clientes  as projection on db.Clientes;
  entity Productos as projection on db.Productos;

  entity Pedidos as projection on db.Pedidos actions {
    action enviar()                         returns Pedidos;
    action entregar()                       returns Pedidos;
    action cancelar(motivo : String(200))   returns Pedidos;
    action devolver()   returns Pedidos;
  };

  function totalPorCliente(cliente : Integer) returns Decimal(12,2);

  event PedidoEnviado : (pedido : Integer, cliente : Integer, total : Decimal(12,2));
  event StockBajo : (producto : Integer, nombre : String(100), stock : Integer);

  @cds.redirection.target: false
  entity ClientesSinEmail as projection on db.Clientes excluding { email };
}

// El cliente no puede tocar estos campos: solo los cambian las actions
annotate TiendaService.Pedidos with {
  estado            @readonly;
  motivoCancelacion @readonly;
};

annotate TiendaService.Productos with {
  stock @readonly;
};