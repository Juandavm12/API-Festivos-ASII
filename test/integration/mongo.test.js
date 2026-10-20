const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { createServer } = require('node:net');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { MongoClient } = require('mongodb');
const { RepositorioFestivos } = require('../../repositorios/festivo.repositorio');
const { cargarCatalogo } = require('../../scripts/cargar-festivos');
const { crearApp } = require('../../app');
let mongo;
let cliente;
let directorio;
let servidor;
let coleccion;
let base;
let uriMongo;

before(async () => {
  // Proceso y directorio propios: nunca toca la base del estudiante.
  directorio = await mkdtemp(join(tmpdir(), 'festivos-mongo-'));
  const reserva = createServer().listen(0, '127.0.0.1');
  await once(reserva, 'listening');
  const puerto = reserva.address().port;
  await new Promise((resolve) => reserva.close(resolve));
  mongo = spawn('mongod', ['--dbpath', directorio, '--bind_ip', '127.0.0.1',
    '--port', String(puerto), '--nounixsocket'], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('mongod no inició en 15 segundos')), 15000);
    const terminar = (error) => { clearTimeout(timer); error ? reject(error) : resolve(); };
    mongo.once('error', terminar);
    mongo.once('exit', (codigo) => terminar(new Error(`mongod terminó: ${codigo}`)));
    let salida = '';
    mongo.stdout.on('data', (datos) => {
      salida += datos.toString();
      if (salida.includes('Waiting for connections')) terminar();
    });
    mongo.stderr.on('data', () => {});
  });
  uriMongo = `mongodb://127.0.0.1:${puerto}`;
  cliente = new MongoClient(uriMongo, { serverSelectionTimeoutMS: 5000 });
  await cliente.connect();
  coleccion = cliente.db('festivos_prueba').collection('tipos');
  await coleccion.createIndex({ indice: 1 }, { unique: true });
  servidor = crearApp(new RepositorioFestivos(coleccion)).listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(async () => {
  if (servidor) await new Promise((resolve) => servidor.close(resolve));
  if (cliente) await cliente.close();
  if (mongo && mongo.exitCode === null && mongo.signalCode === null) {
    const salida = once(mongo, 'exit');
    mongo.kill('SIGTERM');
    await salida;
  }
  if (directorio) await rm(directorio, { recursive: true, force: true });
});

function ejecutarProceso(archivo, entorno) {
  const proceso = spawn(process.execPath, [archivo], {
    cwd: resolve(__dirname, '../..'), env: entorno, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let salida = '';
  proceso.stdout.on('data', (datos) => { salida += datos.toString(); });
  proceso.stderr.on('data', (datos) => { salida += datos.toString(); });
  const terminado = once(proceso, 'exit');
  // También limita fallos de arranque y evita procesos persistentes si una aserción falla.
  const timer = setTimeout(() => proceso.kill('SIGKILL'), 15000);
  terminado.finally(() => clearTimeout(timer)).catch(() => {});
  return { proceso, terminado, salida: () => salida };
}

async function solicitud(ruta, metodo = 'GET', cuerpo) {
  return fetch(`${base}${ruta}`, { method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
}

test('CLI seed y server.js reales: persistencia, contratos y cierre SIGTERM', { timeout: 40000 }, async (t) => {
  const entorno = { MONGODB_URI: uriMongo, MONGODB_DATABASE: 'festivos_cli_prueba',
    HOST: '127.0.0.1' };
  const tipos = cliente.db(entorno.MONGODB_DATABASE).collection('tipos');
  for (let intento = 0; intento < 2; intento += 1) {
    const seed = ejecutarProceso('scripts/cargar-festivos.js', entorno);
    assert.deepEqual(await seed.terminado, [0, null], seed.salida());
    assert.match(seed.salida(), /Catálogo cargado/);
    assert.equal(await tipos.countDocuments(), 4);
    if (intento === 0) await tipos.updateOne({ indice: 1 }, { $set: { tipo: 'Conservado por CLI' } });
  }
  assert.equal((await tipos.findOne({ indice: 1 })).tipo, 'Conservado por CLI');
  const reserva = createServer().listen(0, '127.0.0.1');
  await once(reserva, 'listening');
  entorno.PORT = String(reserva.address().port);
  await new Promise((resolve) => reserva.close(resolve));
  const api = ejecutarProceso('server.js', entorno);
  t.after(async () => {
    if (api.proceso.exitCode === null && api.proceso.signalCode === null) api.proceso.kill('SIGTERM');
    await api.terminado;
  });
  const direccion = `http://127.0.0.1:${entorno.PORT}`;
  while (!api.salida().includes('API disponible')) {
    assert.equal(api.proceso.exitCode, null, api.salida());
    assert.equal(api.proceso.signalCode, null, api.salida());
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const pedir = (ruta) => fetch(`${direccion}${ruta}`, {
    headers: { Connection: 'close' }, signal: AbortSignal.timeout(5000),
  });
  const respuesta = await pedir('/api/festivos/obtener/2023');
  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).length, 19);
  for (const [fecha, esperado] of [
    ['2023/6/12', 'Es Festivo'], ['2023/2/28', 'No es festivo'], ['2023/2/35', 'Fecha No valida'],
  ]) {
    const verificacion = await pedir(`/api/festivos/verificar/${fecha}`);
    assert.equal(verificacion.status, 200);
    assert.equal(await verificacion.text(), esperado);
  }
  const tipo = await pedir('/api/tipos/1');
  assert.equal(tipo.status, 200);
  assert.equal((await tipo.json()).tipo, 'Conservado por CLI');
  api.proceso.kill('SIGTERM');
  assert.deepEqual(await api.terminado, [0, null], api.salida());
  await assert.rejects(pedir('/api/tipos/1'));
});

test('Mongo real: catálogo idempotente, contratos del profesor y CRUD persistente', async () => {
  await cargarCatalogo(coleccion);
  await cargarCatalogo(coleccion);
  assert.equal(await coleccion.countDocuments(), 4);
  const lista = await (await solicitud('/api/festivos/obtener/2023')).json();
  assert.equal(lista.length, 19);
  assert.deepEqual(lista.slice(0, 4), [
    { festivo: 'Año nuevo', fecha: '2023-01-01' },
    { festivo: 'Santos Reyes', fecha: '2023-01-09' },
    { festivo: 'San José', fecha: '2023-03-20' },
    { festivo: 'Jueves Santo', fecha: '2023-04-06' },
  ]);
  assert.equal(await (await solicitud('/api/festivos/verificar/2023/6/12')).text(), 'Es Festivo');
  assert.equal(await (await solicitud('/api/festivos/verificar/2023/2/28')).text(), 'No es festivo');
  assert.equal(await (await solicitud('/api/festivos/verificar/2023/2/35')).text(), 'Fecha No valida');
  const original = await (await solicitud('/api/tipos/1')).json();
  assert.ok(original._id);
  assert.equal(original.festivos.length, 6);
  const modificado = { indice: 1, tipo: 'Fijo de prueba', modoCalcularlo: 'Fecha fija', festivos: [] };
  assert.equal((await solicitud('/api/tipos/1', 'PUT', modificado)).status, 200);
  assert.equal((await coleccion.findOne({ indice: 1 }))._id.toString(), original._id);
  await cargarCatalogo(coleccion);
  assert.equal((await coleccion.findOne({ indice: 1 })).tipo, 'Fijo de prueba');
  assert.equal((await solicitud('/api/tipos/1', 'DELETE')).status, 204);
  assert.equal(await coleccion.countDocuments({ indice: 1 }), 0);
  const creaciones = await Promise.all([
    solicitud('/api/tipos', 'POST', modificado), solicitud('/api/tipos', 'POST', modificado),
  ]);
  assert.deepEqual(creaciones.map((res) => res.status).sort(), [201, 409]);
  assert.equal(await coleccion.countDocuments({ indice: 1 }), 1);
  assert.equal((await solicitud('/api/tipos/1', 'DELETE')).status, 204);
  assert.equal((await solicitud('/api/tipos/1', 'DELETE')).status, 404);
  assert.equal((await solicitud('/api/tipos/1', 'PUT', modificado)).status, 404);
});
