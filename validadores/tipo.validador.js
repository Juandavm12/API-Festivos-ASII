const { fechaValida } = require('../servicios/festivo.servicio');

function objeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}
function texto(valor) {
  return typeof valor === 'string' && valor.trim().length > 0 && valor.length <= 500;
}
function soloCampos(valor, campos) {
  return Object.keys(valor).every((campo) => campos.includes(campo));
}
function tipoValido(tipo) {
  if (!objeto(tipo) || !soloCampos(tipo, ['indice', 'tipo', 'modoCalcularlo', 'festivos'])) return false;
  if (!Number.isInteger(tipo.indice) || tipo.indice < 1 || tipo.indice > 4) return false;
  if (!texto(tipo.tipo) || !texto(tipo.modoCalcularlo) || !Array.isArray(tipo.festivos)) return false;
  return tipo.festivos.every((festivo) => {
    if (!objeto(festivo) || !texto(festivo.nombre)) return false;
    if (tipo.indice <= 2) {
      return soloCampos(festivo, ['nombre', 'dia', 'mes'])
        && fechaValida(2024, festivo.mes, festivo.dia);
    }
    return soloCampos(festivo, ['nombre', 'diasPascua'])
      && Number.isInteger(festivo.diasPascua) && Math.abs(festivo.diasPascua) <= 366;
  });
}
function validarIndice(req, res, next) {
  if (!/^[1-4]$/.test(req.params.indice)) {
    return res.status(400).json({ error: 'El índice debe ser un entero entre 1 y 4' });
  }
  req.indice = Number(req.params.indice);
  next();
}
function validarTipo(req, res, next) {
  if (!tipoValido(req.body) || (req.indice !== undefined && req.body.indice !== req.indice)) {
    return res.status(400).json({ error: 'Tipo inválido: revise índice, descripción y festivos según su estrategia' });
  }
  next();
}
module.exports = { validarIndice, validarTipo, tipoValido };
