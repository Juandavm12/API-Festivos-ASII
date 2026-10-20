function configuracion() {
  const puerto = process.env.PORT ?? '8080';
  if (!/^\d+$/.test(puerto) || Number(puerto) < 1 || Number(puerto) > 65535) {
    throw new Error('PORT debe estar entre 1 y 65535');
  }
  return {
    puerto: Number(puerto),
    host: process.env.HOST ?? '127.0.0.1',
    uri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
    base: process.env.MONGODB_DATABASE ?? 'festivos',
  };
}
module.exports = { configuracion };
