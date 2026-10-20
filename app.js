const express = require('express');
const { ServicioFestivos } = require('./servicios/festivo.servicio');
const { ServicioTipos } = require('./servicios/tipo.servicio');
const { controladorFestivos } = require('./controladores/festivo.controlador');
const { controladorTipos } = require('./controladores/tipo.controlador');
const { rutasFestivos } = require('./rutas/festivo.rutas');
const { rutasTipos } = require('./rutas/tipo.rutas');

function crearApp(repositorio) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/festivos', rutasFestivos(controladorFestivos(new ServicioFestivos(repositorio))));
  app.use('/api/tipos', rutasTipos(controladorTipos(new ServicioTipos(repositorio))));
  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Cuerpo demasiado grande' });
    if (error.code === 11000) return res.status(409).json({ error: 'Ya existe un tipo con ese índice' });
    // Express y el parser ya clasifican errores de URI, charset y compresión.
    const estado = error.status ?? error.statusCode;
    if (Number.isInteger(estado) && estado >= 400 && estado < 500) {
      const mensaje = estado === 415 ? 'Formato de solicitud no admitido' : 'Solicitud inválida';
      return res.status(estado).json({ error: mensaje });
    }
    res.status(503).json({ error: 'No fue posible acceder al catálogo de festivos' });
  });
  return app;
}
module.exports = { crearApp };
