class ServicioTipos {
  constructor(repositorio) {
    this.repositorio = repositorio;
  }
  listar() { return this.repositorio.listar(); }
  buscar(indice) { return this.repositorio.buscar(indice); }
  crear(tipo) { return this.repositorio.crear(tipo); }
  actualizar(indice, tipo) { return this.repositorio.actualizar(indice, tipo); }
  eliminar(indice) { return this.repositorio.eliminar(indice); }
}
module.exports = { ServicioTipos };
