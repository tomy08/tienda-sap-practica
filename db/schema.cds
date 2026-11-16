namespace tienda;

using {managed, cuid} from '@sap/cds/common';

type Estado : String(20) enum {
  Nuevo;
  Enviado;
  Entregado;
  Cancelado;
}

entity Clientes {
  key ID     : Integer;
      nombre : String(100);
      email  : String(100);
}

entity Productos {
  key ID     : Integer;
      nombre : String(100);
      precio : Decimal(10, 2);
      stock  : Integer default 0;
}

entity Pedidos : managed {
  key ID                : Integer;
      cliente           : Association to Clientes;
      estado            : Estado default 'Nuevo';
      motivoCancelacion : String(200);
      total             : Decimal(12, 2);
      items             : Composition of many PedidoItems
                            on items.pedido = $self;
      esNuevo           : Boolean = case
                                      when estado = 'Nuevo'
                                           then true
                                      else false
                                    end;
      esEnviado         : Boolean = case
                                      when estado = 'Enviado'
                                           then true
                                      else false
                                    end;
      bloqueado         : Boolean = case
                                      when estado = 'Nuevo'
                                           then false
                                      else true
                                    end;
      criticidad        : Integer = case
                                      when estado = 'Cancelado'
                                           then 1
                                      when estado = 'Entregado'
                                           then 3
                                      when estado = 'Enviado'
                                           then 5
                                      else 0
                                    end;
}

entity PedidoItems : cuid {
  pedido   : Association to Pedidos;
  pos      : Integer;
  producto : Association to Productos;
  cantidad : Integer;
  precio   : Decimal(10, 2);
  subtotal : Decimal(12, 2) = precio * cantidad;
}

entity Notificaciones : cuid, managed {
  tipo    : String(20);
  mensaje : String(200);
}
