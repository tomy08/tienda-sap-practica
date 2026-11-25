using TiendaService as service from '../../srv/tienda-service';

// ---------- Etiquetas de Pedidos ----------

annotate service.Pedidos with {
  ID                @title: '{i18n>Pedido}';
  estado            @title: '{i18n>Estado}';
  total             @title                 : '{i18n>Total}'
                    @Common.FieldControl   : #ReadOnly;
  motivoCancelacion @title: '{i18n>MotivoCancelacion}';
  createdAt         @title: '{i18n>CreadoEl}';
  createdBy         @title: '{i18n>CreadoPor}';
  modifiedAt        @title: '{i18n>ModificadoEl}';
  modifiedBy        @title: '{i18n>ModificadoPor}';
  cliente           @title                 : '{i18n>Cliente}'
                    @Common.Text           : cliente.nombre
                    @Common.TextArrangement: #TextOnly;

  // Campos auxiliares: existen para que la pantalla decida, no para mostrarse
  esNuevo           @UI.Hidden;
  esEnviado         @UI.Hidden;
  bloqueado         @UI.Hidden;
  criticidad        @UI.Hidden;
}

// ---------- List Report y cabecera ----------

annotate service.Pedidos with @(
  UI.SelectionFields: [
    ID,
    cliente_ID,
    estado
  ],

  UI.LineItem       : [
    {Value: ID},
    {
      Value: cliente.nombre,
      Label: '{i18n>Cliente}'
    },
    {
      Value      : estado,
      Criticality: criticidad
    },
    {Value: total},
    {Value: createdAt},
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'TiendaService.enviar',
      Label : '{i18n>Enviar}'
    },
  ],

  UI.HeaderInfo     : {
    TypeName      : '{i18n>Pedido}',
    TypeNamePlural: '{i18n>Pedidos}',
    Title         : {Value: ID},
    Description   : {Value: cliente.nombre},
  },

  // Botones de la cabecera del Object Page
  UI.Identification : [
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'TiendaService.enviar',
      Label : '{i18n>Enviar}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'TiendaService.entregar',
      Label : '{i18n>Entregar}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'TiendaService.cancelar',
      Label : '{i18n>Cancelar}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'TiendaService.devolver',
      Label : '{i18n>Devolver}'
    },
  ],

  // Editar y borrar solo pedidos Nuevos
  UI.UpdateHidden   : bloqueado,
  UI.DeleteHidden   : bloqueado,
);

// ---------- Object Page de Pedidos ----------

annotate service.Pedidos with @(
  UI.FieldGroup #General  : {Data: [
    {Value: ID},
    {Value: cliente_ID},
    {
      Value      : estado,
      Criticality: criticidad
    },
    {Value: createdAt},
  ]},
  UI.FieldGroup #Totales  : {Data: [
    {Value: total},
    {Value: motivoCancelacion},
  ]},
  UI.FieldGroup #Auditoria: {Data: [
    {Value: createdAt},
    {Value: createdBy},
    {Value: modifiedAt},
    {Value: modifiedBy},
  ]},

  UI.Facets               : [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'General',
      Label : '{i18n>General}',
      Target: '@UI.FieldGroup#General'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Totales',
      Label : '{i18n>Importes}',
      Target: '@UI.FieldGroup#Totales'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Items',
      Label : '{i18n>Items}',
      Target: 'items/@UI.LineItem'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Auditoria',
      Label : '{i18n>Auditoria}',
      Target: '@UI.FieldGroup#Auditoria'
    },
  ]
);

// ---------- Actions ----------

annotate service.Pedidos with actions {
  enviar   @Core.OperationAvailable: {$edmJson: {$Path: 'in/esNuevo'}};
  cancelar @Core.OperationAvailable: {$edmJson: {$Path: 'in/esNuevo'}};
  entregar @Core.OperationAvailable: {$edmJson: {$Path: 'in/esEnviado'}};
  devolver @Core.OperationAvailable: {$edmJson: {$Path: 'in/esEnviado'}};
};

annotate service.Pedidos with actions {
  cancelar(motivo @title: '{i18n>MotivoCancelacion}' );
};

// ---------- Ítems ----------

annotate service.PedidoItems with {
  pos      @title                 : '{i18n>Posicion}'
           @Common.FieldControl   : #ReadOnly;
  producto @title                 : '{i18n>Producto}'
           @Common.Text           : producto.nombre
           @Common.TextArrangement: #TextOnly;
  cantidad @title: '{i18n>Cantidad}';
  precio   @title                 : '{i18n>PrecioUnitario}'
           @Common.FieldControl   : #ReadOnly;
  subtotal @title: '{i18n>Subtotal}';
}

annotate service.PedidoItems with @(UI.LineItem: [
  {Value: pos},
  {Value: producto_ID},
  {Value: cantidad},
  {Value: precio},
  {Value: subtotal},
]);

// ---------- Value helps ----------

annotate service.Clientes with @cds.odata.valuelist;

annotate service.Clientes with {
  ID     @title: '{i18n>NroCliente}';
  nombre @title: '{i18n>Nombre}';
  email  @title: '{i18n>Email}';
}

annotate service.Productos with @cds.odata.valuelist;

annotate service.Productos with {
  ID     @title: '{i18n>NroProducto}';
  nombre @title: '{i18n>Nombre}';
  precio @title: '{i18n>Precio}';
  stock  @title: '{i18n>Stock}';
}
