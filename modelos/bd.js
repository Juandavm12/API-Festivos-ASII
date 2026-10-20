const { MongoClient } = require('mongodb');

async function conectarBD(config) {
  const cliente = new MongoClient(config.uri, {
    serverSelectionTimeoutMS: 5000, timeoutMS: 5000,
  });
  try {
    await cliente.connect();
    const coleccion = cliente.db(config.base).collection('tipos');
    await coleccion.createIndex({ indice: 1 }, { unique: true });
    return { cliente, coleccion };
  } catch (error) {
    await cliente.close();
    throw error;
  }
}
module.exports = { conectarBD };
