const { crearApp } = require('./app');
const { configuracion } = require('./configuracion/bd.config');
const { conectarBD } = require('./modelos/bd');
const { RepositorioFestivos } = require('./repositorios/festivo.repositorio');

async function iniciar() {
  const config = configuracion();
  const { cliente, coleccion } = await conectarBD(config);
  const servidor = crearApp(new RepositorioFestivos(coleccion)).listen(config.puerto, config.host);
  servidor.once('listening', () => console.log(`API disponible en http://${config.host}:${config.puerto}`));
  servidor.once('error', async () => {
    console.error('No fue posible iniciar el servidor HTTP');
    await cliente.close();
    process.exitCode = 1;
  });
  let cerrando = false;
  const cerrar = () => {
    if (cerrando) return;
    cerrando = true;
    servidor.close(async () => { await cliente.close(); });
  };
  process.once('SIGINT', cerrar);
  process.once('SIGTERM', cerrar);
}

if (require.main === module) {
  iniciar().catch(() => {
    console.error('No fue posible iniciar la API. Revise la configuración y la conexión a MongoDB');
    process.exitCode = 1;
  });
}
module.exports = { iniciar };
