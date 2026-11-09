using from './schema';

annotate tienda.Pedidos with {
  cliente @mandatory @assert.target;
  estado  @assert.range;
}

annotate tienda.PedidoItems with {
  producto @mandatory @assert.target;
  cantidad @mandatory @assert.range: [1, 100];
}