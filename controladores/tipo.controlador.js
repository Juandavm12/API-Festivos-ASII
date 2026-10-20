function controladorTipos(servicio) {
  const noEncontrado = (res) => res.status(404).json({ error: 'Tipo no encontrado' });
  return {
    listar: async (req, res) => res.json(await servicio.listar()),
    buscar: async (req, res) => {
      const tipo = await servicio.buscar(req.indice);
      return tipo ? res.json(tipo) : noEncontrado(res);
    },
    crear: async (req, res) => {
      const tipo = await servicio.crear(req.body);
      res.location(`/api/tipos/${tipo.indice}`).status(201).json(tipo);
    },
    actualizar: async (req, res) => {
      const tipo = await servicio.actualizar(req.indice, req.body);
      return tipo ? res.json(tipo) : noEncontrado(res);
    },
    eliminar: async (req, res) => {
      return await servicio.eliminar(req.indice) ? res.status(204).end() : noEncontrado(res);
    },
  };
}
module.exports = { controladorTipos };
