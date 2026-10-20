const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ServicioFestivos, fechaValida, calcularPascua } = require('../servicios/festivo.servicio');

const tipos = [
  { indice: 1, festivos: [{ dia: 1, mes: 1, nombre: 'Año nuevo' }] },
  { indice: 2, festivos: [{ dia: 6, mes: 1, nombre: 'Santos Reyes' }] },
  { indice: 3, festivos: [
    { diasPascua: -3, nombre: 'Jueves Santo' },
    { diasPascua: 0, nombre: 'Domingo de Pascua' },
  ] },
  { indice: 4, festivos: [{ diasPascua: 61, nombre: 'Corpus Christi' }] },
];
const servicio = new ServicioFestivos({ listar: async () => tipos });

test('valida calendario real, bisiestos y límites sin normalizar fechas inválidas', () => {
  assert.equal(fechaValida(2023, 2, 35), false);
  assert.equal(fechaValida(2023, 2, 29), false);
  assert.equal(fechaValida(2024, 2, 29), true);
  assert.equal(fechaValida(1900, 2, 29), false);
  assert.equal(fechaValida(2000, 2, 29), true);
  assert.equal(fechaValida(2023, 13, 1), false);
  assert.equal(fechaValida(0, 1, 1), false);
  assert.equal(fechaValida(10000, 1, 1), false);
  assert.equal(fechaValida(99, 1, 1), true);
});

test('calcula Pascua incluyendo el ejemplo de 1999 y excepciones de Gauss', () => {
  for (const [anio, fecha] of [
    [1999, '1999-04-04'], [2023, '2023-04-09'], [2026, '2026-04-05'],
    [1954, '1954-04-18'], [1981, '1981-04-19'],
    [2049, '2049-04-18'], [2076, '2076-04-19'], [2100, '2100-03-28'],
  ]) assert.equal(calcularPascua(anio).toISOString().slice(0, 10), fecha);
});

test('genera los cuatro tipos, ordena y respeta el contrato festivo/fecha', async () => {
  assert.deepEqual(await servicio.obtener(2023), [
    { festivo: 'Año nuevo', fecha: '2023-01-01' },
    { festivo: 'Santos Reyes', fecha: '2023-01-09' },
    { festivo: 'Jueves Santo', fecha: '2023-04-06' },
    { festivo: 'Domingo de Pascua', fecha: '2023-04-09' },
    { festivo: 'Corpus Christi', fecha: '2023-06-12' },
  ]);
  assert.equal((await servicio.obtener(2025))[1].fecha, '2025-01-06');
});

test('reproduce ejemplos del profesor sin consultar Mongo para fecha inválida', async () => {
  assert.equal(await servicio.verificar(2023, 6, 12), 'Es Festivo');
  assert.equal(await servicio.verificar(2023, 2, 28), 'No es festivo');
  const sinBD = new ServicioFestivos({ listar: () => assert.fail('No debe consultar') });
  assert.equal(await sinBD.verificar(2023, 2, 35), 'Fecha No valida');
});

test('un catálogo vacío no inventa festivos ni oculta una falla del repositorio', async () => {
  assert.deepEqual(await new ServicioFestivos({ listar: async () => [] }).obtener(2023), []);
  const error = new Error('Mongo no disponible');
  await assert.rejects(new ServicioFestivos({ listar: async () => { throw error; } }).obtener(2023), error);
});

test('asigna el 31 de diciembre trasladado al año destino, sin duplicarlo', async () => {
  const servicio = new ServicioFestivos({ listar: async () => [
    { indice: 2, festivos: [{ mes: 12, dia: 31, nombre: 'Cierre' }] },
  ] });
  assert.deepEqual(await servicio.obtener(2023), [
    { festivo: 'Cierre', fecha: '2023-01-02' },
  ]);
  assert.deepEqual(await servicio.obtener(2024), [
    { festivo: 'Cierre', fecha: '2024-01-01' },
  ]);
  assert.equal(await servicio.verificar(2024, 1, 1), 'Es Festivo');
});

for (const [indice, offset, anio, fecha] of [
  [3, 366, 2024, '2024-04-09'],
  [3, -366, 2022, '2022-04-08'],
  [4, 366, 2024, '2024-04-15'],
  [4, -366, 2022, '2022-04-11'],
]) {
  test(`incluye anclas vecinas para tipo ${indice}, offset ${offset}`, async () => {
    const servicio = new ServicioFestivos({ listar: async () => [
      { indice, festivos: [{ diasPascua: offset, nombre: 'Extremo' }] },
    ] });
    assert.deepEqual(await servicio.obtener(anio), [{ festivo: 'Extremo', fecha }]);
    const [, mes, dia] = fecha.split('-').map(Number);
    assert.equal(await servicio.verificar(anio, mes, dia), 'Es Festivo');
  });
}

test('tipo 4 conserva lunes y no duplica su ancla del mismo año', async () => {
  const servicio = new ServicioFestivos({ listar: async () => [
    { indice: 4, festivos: [{ diasPascua: 1, nombre: 'Lunes de Pascua' }] },
  ] });
  assert.deepEqual(await servicio.obtener(2023), [
    { festivo: 'Lunes de Pascua', fecha: '2023-04-10' },
  ]);
});

test('limita las anclas a 1–9999 y conserva cruces hacia años públicos extremos', async () => {
  for (const [anio, offset, ancla] of [[1, -366, 2], [9999, 366, 9998]]) {
    const servicio = new ServicioFestivos({ listar: async () => [
      { indice: 3, festivos: [{ diasPascua: offset, nombre: 'Límite' }] },
    ] });
    const fecha = new Date(calcularPascua(ancla).getTime() + offset * 86400000)
      .toISOString().slice(0, 10);
    assert.deepEqual(await servicio.obtener(anio), [{ festivo: 'Límite', fecha }]);
    const opuesto = new ServicioFestivos({ listar: async () => [
      { indice: 3, festivos: [{ diasPascua: -offset, nombre: 'Fuera' }] },
    ] });
    assert.deepEqual(await opuesto.obtener(anio), []);
  }
});
