class RepositorioFestivos {
  constructor(coleccion) {
    this.coleccion = coleccion;
  }
  listar() { return this.coleccion.find({}).sort({ indice: 1 }).toArray(); }
  buscar(indice) { return this.coleccion.findOne({ indice }); }
  async crear(tipo) {
    const documento = { ...tipo };
    const resultado = await this.coleccion.insertOne(documento);
    return { ...documento, _id: resultado.insertedId };
  }
  actualizar(indice, tipo) {
    // $set conserva el ObjectId y nunca permite cambiar la estrategia del índice.
    return this.coleccion.findOneAndUpdate(
      { indice }, { $set: tipo }, { returnDocument: 'after', includeResultMetadata: false },
    );
  }
  async eliminar(indice) {
    return (await this.coleccion.deleteOne({ indice })).deletedCount === 1;
  }
}
module.exports = { RepositorioFestivos };
