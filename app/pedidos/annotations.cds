using TiendaService as service from '../../srv/tienda-service';

// 1. Etiquetas: se usan en toda la app (columnas, filtros, formularios)


annotate service.Pedidos with {
  ID     @title: 'Pedido';
  estado @title: 'Estado';
  total  @title: 'Total';
  motivoCancelacion @title: 'Motivo de cancelación';
  createdAt  @title: 'Creado el';
  createdBy  @title: 'Creado por';
  modifiedAt @title: 'Modificado el';
  modifiedBy @title: 'Modificado por';
}

// 2. Cómo se ve la lista y la cabecera de cada pedido
annotate service.Pedidos with @(
  // Barra de filtros
  UI.SelectionFields : [ ID, cliente_ID, estado ],

  // Columnas de la tabla, en este orden
  UI.LineItem : [
    { Value : ID },
    { Value : cliente.nombre, Label : 'Cliente' },
    { Value : estado },
    { Value : total },
    { Value : createdAt },
  ],

  // Título y subtítulo de cada pedido (se ve en el Object Page)
  UI.HeaderInfo : {
    TypeName       : 'Pedido',
    TypeNamePlural : 'Pedidos',
    Title          : { Value : ID },
    Description    : { Value : cliente.nombre },
  }
);

// ---------- Object Page de Pedidos ----------

annotate service.Pedidos with @(
  // Grupos de campos (el #nombre es el calificador)
  UI.FieldGroup #General : {
    Data : [
      { Value : ID },
      { Value : cliente_ID },
      { Value : estado },
      { Value : createdAt },
    ]
  },
  UI.FieldGroup #Totales : {
    Data : [
      { Value : total },
      { Value : motivoCancelacion },
    ]
  },

  UI.FieldGroup #Auditoria : {
    Data : [
      { Value : createdAt },
      { Value : createdBy },
      { Value : modifiedAt },
      { Value : modifiedBy },
    ]
  },

  // Secciones del Object Page, en este orden
  UI.Facets : [
    { $Type : 'UI.ReferenceFacet', ID : 'General', Label : 'General',  Target : '@UI.FieldGroup#General' },
    { $Type : 'UI.ReferenceFacet', ID : 'Totales', Label : 'Importes', Target : '@UI.FieldGroup#Totales' },
    { $Type : 'UI.ReferenceFacet', ID : 'Items',   Label : 'Ítems',    Target : 'items/@UI.LineItem' },
    { $Type : 'UI.ReferenceFacet', ID : 'Auditoria', Label : 'Auditoría', Target : '@UI.FieldGroup#Auditoria' },
  ]
);

// ---------- Tabla de ítems ----------


annotate service.PedidoItems with @(
  UI.LineItem : [
    { Value : pos },
    { Value : producto_ID },
    { Value : cantidad },
    { Value : precio },
    { Value : subtotal },
  ]
);

// ---------- Value help de clientes ----------

annotate service.Clientes with @cds.odata.valuelist;

annotate service.Pedidos with {
  cliente @title: 'Cliente'
          @Common.Text: cliente.nombre
          @Common.TextArrangement: #TextOnly;
}

// Etiquetas de las columnas del diálogo
annotate service.Clientes with {
  ID     @title : 'Nº de cliente';
  nombre @title : 'Nombre';
  email  @title : 'Email';
}


// ---------- Edición ----------

// Campos que se ven pero no se editan (los calcula el servidor)
annotate service.Pedidos with {
  total @Common.FieldControl : #ReadOnly;
}

// Producto: mostrar el nombre en vez del ID y elegirlo de una lista
annotate service.PedidoItems with {
  producto @title : 'Producto'
           @Common.Text : producto.nombre
           @Common.TextArrangement : #TextOnly;
  precio   @Common.FieldControl : #ReadOnly;
}

annotate service.Productos with @cds.odata.valuelist;

annotate service.Productos with {
  ID     @title : 'Nº de producto';
  nombre @title : 'Nombre';
  precio @title : 'Precio';
  stock  @title : 'Stock';
}