function entero(valor) {
  return /^\d{1,4}$/.test(valor) ? Number(valor) : NaN;
}

function validarFecha(req, res, next) {
  req.fecha = ['anio', 'mes', 'dia'].map((campo) => entero(req.params[campo]));
  next();
}

function validarAnio(req, res, next) {
  req.anio = entero(req.params.anio);
  if (!Number.isInteger(req.anio) || req.anio < 1 || req.anio > 9999) {
    return res.status(400).json({ error: 'El año debe ser un entero entre 1 y 9999' });
  }
  next();
}

module.exports = { validarFecha, validarAnio };
