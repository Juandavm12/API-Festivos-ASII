const tipos = require('../datos/tipos.json');
const { tipoValido } = require('../validadores/tipo.validador');
const { conectarBD } = require('../modelos/bd');
const { configuracion } = require('../configuracion/bd.config');

async function cargarCatalogo(coleccion) {
  if (!tipos.every(tipoValido)) throw new Error('El catálogo inicial es inválido');
  for (const tipo of tipos) {
    // Repetir la carga no duplica tipos ni sobrescribe modificaciones del CRUD.
    await coleccion.updateOne({ indice: tipo.indice }, { $setOnInsert: tipo }, { upsert: true });
  }
}

async function ejecutar() {
  const { cliente, coleccion } = await conectarBD(configuracion());
  try {
    await cargarCatalogo(coleccion);
    console.log('Catálogo cargado: tipos existentes conservados y faltantes agregados');
  } finally { await cliente.close(); }
}
if (require.main === module) {
  ejecutar().catch(() => {
    console.error('No fue posible cargar el catálogo. Revise MongoDB y la configuración');
    process.exitCode = 1;
  });
}
module.exports = { cargarCatalogo };
