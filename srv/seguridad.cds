using {TiendaService} from './tienda-service';
using {NotificacionesService} from './notificaciones-service';

// ---------- La puerta de entrada ----------

annotate TiendaService with @requires: 'authenticated-user';

annotate NotificacionesService with @requires: [
    'Deposito',
    'Admin'
];

// ---------- Pedidos: cada rol hace lo suyo ----------

annotate TiendaService.Pedidos with @(restrict: [
    {
        grant: 'READ',
        to   : [
            'Vendedor',
            'Deposito'
        ]
    },
    {
        grant: [
            'CREATE',
            'UPDATE',
            'DELETE'
        ],
        to   : 'Vendedor'
    },
    {
        grant: [
            'enviar',
            'cancelar'
        ],
        to   : 'Vendedor'
    },
    {
        grant: [
            'entregar',
            'devolver'
        ],
        to   : 'Deposito'
    },
    {
        grant: '*',
        to   : 'Admin'
    },
]);

// ---------- Catálogos: todos leen, solo Admin modifica ----------

annotate TiendaService.Productos with @(restrict: [
    {
        grant: 'READ',
        to   : 'authenticated-user'
    },
    {
        grant: '*',
        to   : 'Admin'
    },
]);

annotate TiendaService.Clientes with @(restrict: [
    {
        grant: 'READ',
        to   : 'authenticated-user'
    },
    {
        grant: '*',
        to   : 'Admin'
    },
]);

annotate TiendaService.ClientesSinEmail with @(restrict: [{
    grant: 'READ',
    to   : 'authenticated-user'
}, ]);

// ---------- Function ----------

annotate TiendaService.totalPorCliente with @(requires: [
    'Vendedor',
    'Admin'
]);
