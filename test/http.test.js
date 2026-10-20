const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('../app');

const registros = new Map();
const repositorio = {
  listar: async () => [...registros.values()],
  buscar: async (indice) => registros.get(indice) ?? null,
  crear: async (tipo) => {
    if (registros.has(tipo.indice)) throw Object.assign(new Error('Duplicado'), { code: 11000 });
    registros.set(tipo.indice, tipo);
    return tipo;
  },
  actualizar: async (indice, tipo) => {
    if (!registros.has(indice)) return null;
    registros.set(indice, tipo);
    return tipo;
  },
  eliminar: async (indice) => registros.delete(indice),
};
let servidor;
let base;
before(async () => {
  servidor = crearApp(repositorio).listen(0, '127.0.0.1');
  await new Promise((resolve) => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(async () => new Promise((resolve) => servidor.close(resolve)));
async function solicitar(ruta, metodo = 'GET', cuerpo) {
  return fetch(`${base}${ruta}`, {
    method: metodo,
    headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}
const tipo = {
  indice: 1, tipo: 'Fijo', modoCalcularlo: 'No se puede variar',
  festivos: [{ dia: 1, mes: 1, nombre: 'Año nuevo' }],
};

test('CRUD completo de Tipo conserva festivos embebidos y afecta consultas', async () => {
  assert.deepEqual(await (await solicitar('/api/tipos')).json(), []);
  const creacion = await solicitar('/api/tipos', 'POST', tipo);
  assert.equal(creacion.status, 201);
  assert.equal(creacion.headers.get('location'), '/api/tipos/1');
  assert.deepEqual(await creacion.json(), tipo);
  assert.deepEqual(await (await solicitar('/api/tipos/1')).json(), tipo);
  assert.equal((await solicitar('/api/tipos', 'POST', tipo)).status, 409);
  assert.equal(await (await solicitar('/api/festivos/verificar/2023/1/1')).text(), 'Es Festivo');
  const cambiado = { ...tipo, tipo: 'Fijo actualizado', festivos: [] };
  const actualizacion = await solicitar('/api/tipos/1', 'PUT', cambiado);
  assert.equal(actualizacion.status, 200);
  assert.deepEqual(await actualizacion.json(), cambiado);
  assert.deepEqual(await (await solicitar('/api/festivos/obtener/2023')).json(), []);
  assert.equal((await solicitar('/api/tipos/1', 'DELETE')).status, 204);
  assert.equal((await solicitar('/api/tipos/1')).status, 404);
  assert.equal((await solicitar('/api/tipos/1', 'PUT', tipo)).status, 404);
  assert.equal((await solicitar('/api/tipos/1', 'DELETE')).status, 404);
});

test('rechaza tipos, fechas embebidas, operadores y cambios de estrategia inválidos', async () => {
  const invalidos = [
    {}, null, [], { ...tipo, indice: 5 }, { ...tipo, indice: '1' },
    { ...tipo, tipo: '  ' }, { ...tipo, festivos: {} },
    { ...tipo, $set: { tipo: 'inyectado' } },
    { ...tipo, festivos: [{ dia: 31, mes: 2, nombre: 'Imposible' }] },
    { ...tipo, festivos: [{ dia: 1, mes: 1, nombre: '' }] },
    { ...tipo, indice: 3 },
    { ...tipo, indice: 3, festivos: [{ nombre: 'Pascua', diasPascua: 1.5 }] },
    { ...tipo, indice: 3, festivos: [{ nombre: 'Pascua', diasPascua: 367 }] },
  ];
  for (const cuerpo of invalidos) {
    assert.equal((await solicitar('/api/tipos', 'POST', cuerpo)).status, 400);
  }
  assert.equal((await solicitar('/api/tipos/2', 'PUT', tipo)).status, 400);
  for (const indice of ['abc', '0', '5', '1.1']) {
    assert.equal((await solicitar(`/api/tipos/${indice}`)).status, 400);
  }
});

test('acepta desplazamiento cero y fecha bisiesta en catálogo', async () => {
  const pascua = { ...tipo, indice: 3, festivos: [{ nombre: 'Pascua', diasPascua: 0 }] };
  assert.equal((await solicitar('/api/tipos', 'POST', pascua)).status, 201);
  assert.deepEqual(await (await solicitar('/api/festivos/obtener/2023')).json(), [
    { festivo: 'Pascua', fecha: '2023-04-09' },
  ]);
  await solicitar('/api/tipos/3', 'DELETE');
  const bisiesto = { ...tipo, festivos: [{ nombre: 'Bisiesto', dia: 29, mes: 2 }] };
  assert.equal((await solicitar('/api/tipos', 'POST', bisiesto)).status, 201);
  assert.deepEqual(await (await solicitar('/api/festivos/obtener/2023')).json(), []);
  assert.equal((await (await solicitar('/api/festivos/obtener/2024')).json())[0].fecha, '2024-02-29');
  await solicitar('/api/tipos/1', 'DELETE');
});

test('contrato de fechas inválidas, año fuera de rango y rutas inexistentes', async () => {
  for (const fecha of ['2023/2/35', '2023/2/29', 'abc/1/1', '2023/1.5/1']) {
    const respuesta = await solicitar(`/api/festivos/verificar/${fecha}`);
    assert.equal(respuesta.status, 200);
    assert.equal(await respuesta.text(), 'Fecha No valida');
  }
  assert.equal((await solicitar('/api/festivos/obtener/0')).status, 400);
  assert.equal((await solicitar('/api/festivos/obtener/10000')).status, 400);
  assert.equal((await solicitar('/desconocido')).status, 404);
  const malformado = await fetch(`${base}/api/tipos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformado.status, 400);
});

test('URI malformada devuelve 400 sin consultar el repositorio', async () => {
  const originales = { ...repositorio };
  let consultas = 0;
  for (const metodo of Object.keys(repositorio)) {
    repositorio[metodo] = async () => { consultas += 1; throw new Error('No debe consultar'); };
  }
  try {
    for (const ruta of ['/api/tipos/%FF', '/api/festivos/verificar/2023/1/%E0%A4%A']) {
      const respuesta = await solicitar(ruta);
      assert.equal(respuesta.status, 400);
      assert.deepEqual(await respuesta.json(), { error: 'Solicitud inválida' });
    }
    assert.equal(consultas, 0);
  } finally { Object.assign(repositorio, originales); }
});

test('charset o compresión no admitidos devuelven 415 sin consultar el repositorio', async () => {
  const originales = { ...repositorio };
  let consultas = 0;
  for (const metodo of Object.keys(repositorio)) {
    repositorio[metodo] = async () => { consultas += 1; throw new Error('No debe consultar'); };
  }
  try {
    for (const headers of [
      { 'Content-Type': 'application/json; charset=iso-8859-1' },
      { 'Content-Type': 'application/json', 'Content-Encoding': 'algo-invalido' },
    ]) {
      const respuesta = await fetch(`${base}/api/tipos`, { method: 'POST', headers, body: '{}' });
      assert.equal(respuesta.status, 415);
      assert.deepEqual(await respuesta.json(), { error: 'Formato de solicitud no admitido' });
    }
    assert.equal(consultas, 0);
  } finally { Object.assign(repositorio, originales); }
});

test('errores de persistencia no filtran detalles internos', async () => {
  const listar = repositorio.listar;
  repositorio.listar = async () => { throw new Error('credenciales privadas'); };
  try {
    const respuesta = await solicitar('/api/tipos');
    assert.equal(respuesta.status, 503);
    assert.deepEqual(await respuesta.json(), { error: 'No fue posible acceder al catálogo de festivos' });
  } finally { repositorio.listar = listar; }
});
