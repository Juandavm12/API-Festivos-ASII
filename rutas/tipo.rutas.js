const { Router } = require('express');
const { validarIndice, validarTipo } = require('../validadores/tipo.validador');

function rutasTipos(controlador) {
  const rutas = Router();
  rutas.get('/', controlador.listar);
  rutas.post('/', validarTipo, controlador.crear);
  rutas.get('/:indice', validarIndice, controlador.buscar);
  rutas.put('/:indice', validarIndice, validarTipo, controlador.actualizar);
  rutas.delete('/:indice', validarIndice, controlador.eliminar);
  return rutas;
}
module.exports = { rutasTipos };
