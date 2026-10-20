const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

function consultar(entorno = {}) {
  return spawnSync(process.execPath, ['-e',
    'console.log(JSON.stringify(require("./configuracion/bd.config").configuracion()))'], {
    cwd: resolve(__dirname, '..'), env: entorno, encoding: 'utf8', timeout: 5000,
  });
}

test('configuración por defecto sin depender del entorno del usuario', () => {
  const resultado = consultar();
  assert.ifError(resultado.error);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.deepEqual(JSON.parse(resultado.stdout), {
    puerto: 8080, host: '127.0.0.1', uri: 'mongodb://127.0.0.1:27017', base: 'festivos',
  });
});

test('configuración acepta entorno explícito y límites válidos de PORT', () => {
  for (const puerto of ['1', '65535']) {
    const resultado = consultar({ PORT: puerto, HOST: 'localhost',
      MONGODB_URI: 'mongodb://127.0.0.1:12345', MONGODB_DATABASE: 'prueba' });
    assert.ifError(resultado.error);
    assert.equal(resultado.status, 0, resultado.stderr);
    assert.deepEqual(JSON.parse(resultado.stdout), {
      puerto: Number(puerto), host: 'localhost', uri: 'mongodb://127.0.0.1:12345', base: 'prueba',
    });
  }
});

test('configuración rechaza PORT inválido antes de abrir conexiones', () => {
  for (const puerto of ['', '0', '65536', '-1', '3.5', 'abc', ' 8080', '8080 ']) {
    const resultado = consultar({ PORT: puerto });
    assert.ifError(resultado.error);
    assert.equal(resultado.status, 1, `PORT=${JSON.stringify(puerto)}`);
    assert.match(resultado.stderr, /PORT debe estar entre 1 y 65535/);
  }
});
