using { tienda } from '../db/schema';

service NotificacionesService {
  @readonly
  entity Notificaciones as projection on tienda.Notificaciones;
}
