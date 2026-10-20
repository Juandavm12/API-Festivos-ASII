const { Router } = require('express');
const { validarFecha, validarAnio } = require('../validadores/festivo.validador');

function rutasFestivos(controlador) {
  const rutas = Router();
  rutas.get('/verificar/:anio/:mes/:dia', validarFecha, controlador.verificar);
  rutas.get('/obtener/:anio', validarAnio, controlador.obtener);
  return rutas;
}
module.exports = { rutasFestivos };
