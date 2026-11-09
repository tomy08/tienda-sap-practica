using { tienda as db } from '../db/schema';

service TiendaService {
  entity Clientes  as projection on db.Clientes;
  entity Productos as projection on db.Productos;
  entity Pedidos   as projection on db.Pedidos;

  @cds.redirection.target: false
  entity ClientesSinEmail as projection on db.Clientes excluding { email };
}