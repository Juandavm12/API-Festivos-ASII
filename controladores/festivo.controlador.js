function controladorFestivos(servicio) {
  return {
    verificar: async (req, res) => res.type('text/plain').send(await servicio.verificar(...req.fecha)),
    obtener: async (req, res) => res.json(await servicio.obtener(req.anio)),
  };
}
module.exports = { controladorFestivos };
