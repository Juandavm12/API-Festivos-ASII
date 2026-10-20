const DIA_MS = 24 * 60 * 60 * 1000;

function crearFecha(anio, mes, dia) {
  const fecha = new Date(0);
  fecha.setUTCFullYear(anio, mes - 1, dia);
  return fecha;
}

function fechaValida(anio, mes, dia) {
  if (![anio, mes, dia].every(Number.isInteger) || anio < 1 || anio > 9999) return false;
  const fecha = crearFecha(anio, mes, dia);
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1
    && fecha.getUTCDate() === dia;
}

function sumarDias(fecha, dias) {
  return new Date(fecha.getTime() + dias * DIA_MS);
}

function calcularPascua(anio) {
  // Gauss gregoriano: en 1900–2099 M=24 y N=5, como en la guía.
  // Los ajustes de siglo y excepciones evitan fechas incorrectas fuera del ejemplo.
  const a = anio % 19;
  const b = anio % 4;
  const c = anio % 7;
  const siglo = Math.floor(anio / 100);
  const p = Math.floor((13 + 8 * siglo) / 25);
  const q = Math.floor(siglo / 4);
  const m = (15 - p + siglo - q) % 30;
  const n = (4 + siglo - q) % 7;
  const d = (19 * a + m) % 30;
  const e = (2 * b + 4 * c + 6 * d + n) % 7;
  const excepcion = e === 6 && (d === 29 || (d === 28 && a > 10));
  // Ramos: 15 de marzo + d + e. Pascua: siete días después.
  return sumarDias(crearFecha(anio, 3, 15), d + e + 7 - (excepcion ? 7 : 0));
}

function trasladarAlLunes(fecha) {
  return sumarDias(fecha, (8 - fecha.getUTCDay()) % 7);
}

class ServicioFestivos {
  constructor(repositorio) {
    this.repositorio = repositorio;
  }

  async obtener(anio) {
    const tipos = await this.repositorio.listar();
    const resultado = [];
    // Los offsets admitidos (±366 días) y el traslado de hasta seis días
    // solo pueden cruzar hacia un año vecino. Las anclas también son públicas.
    for (let ancla = Math.max(1, anio - 1); ancla <= Math.min(9999, anio + 1); ancla++) {
      const pascua = calcularPascua(ancla);
      for (const tipo of tipos) {
        for (const festivo of tipo.festivos) {
          let fecha = tipo.indice <= 2
            ? crearFecha(ancla, festivo.mes, festivo.dia)
            : sumarDias(pascua, festivo.diasPascua);
          // El 29 de febrero solo existe en años bisiestos.
          if (tipo.indice <= 2 && !fechaValida(ancla, festivo.mes, festivo.dia)) continue;
          if (tipo.indice === 2 || tipo.indice === 4) fecha = trasladarAlLunes(fecha);
          if (fecha.getUTCFullYear() !== anio) continue;
          resultado.push({ festivo: festivo.nombre, fecha: fecha.toISOString().slice(0, 10) });
        }
      }
    }
    return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  async verificar(anio, mes, dia) {
    if (!fechaValida(anio, mes, dia)) return 'Fecha No valida';
    const fecha = crearFecha(anio, mes, dia).toISOString().slice(0, 10);
    return (await this.obtener(anio)).some((festivo) => festivo.fecha === fecha)
      ? 'Es Festivo' : 'No es festivo';
  }
}

module.exports = { ServicioFestivos, fechaValida, calcularPascua };
