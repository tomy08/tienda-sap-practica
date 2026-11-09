namespace tienda;
using { managed } from '@sap/cds/common';

type Estado : String(20) enum { Nuevo; Enviado; Entregado; }

entity Clientes {
  key ID     : Integer;
      nombre : String(100);
      email  : String(100);
}

entity Productos {
  key ID     : Integer;
      nombre : String(100);
      precio : Decimal(10,2);
}

entity Pedidos : managed {
  key ID      : Integer;
      cliente : Association to Clientes;
      estado  : Estado default 'Nuevo';
      total   : Decimal(12,2);                       // lo calcula el servidor
      items   : Composition of many PedidoItems on items.pedido = $self;
}

entity PedidoItems {
  key pedido   : Association to Pedidos;
  key pos      : Integer;
      producto : Association to Productos;
      cantidad : Integer;
      precio   : Decimal(10,2);                      // foto del precio al comprar
      subtotal : Decimal(12,2) = precio * cantidad;  // se calcula al leer
}