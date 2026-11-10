namespace tienda;
using { managed } from '@sap/cds/common';

type Estado : String(20) enum { Nuevo; Enviado; Entregado; Cancelado; }

entity Clientes {
  key ID     : Integer;
      nombre : String(100);
      email  : String(100);
}

entity Productos {
  key ID     : Integer;
      nombre : String(100);
      precio : Decimal(10,2);
      stock  : Integer default 0;
}

entity Pedidos : managed {
  key ID                : Integer;
      cliente           : Association to Clientes;
      estado            : Estado default 'Nuevo';
      motivoCancelacion : String(200);
      total             : Decimal(12,2);
      items             : Composition of many PedidoItems on items.pedido = $self;
}

entity PedidoItems {
  key pedido   : Association to Pedidos;
  key pos      : Integer;
      producto : Association to Productos;
      cantidad : Integer;
      precio   : Decimal(10,2);
      subtotal : Decimal(12,2) = precio * cantidad;
}