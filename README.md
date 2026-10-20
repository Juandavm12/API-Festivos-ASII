# API de Festivos — Taller 1 y Taller 2

Modelado de la **API 1 del Taller 1 de Arquitectura de Software II**. La solución propuesta utiliza **Express.js** para la API REST y **MongoDB** para almacenar los tipos de cálculo con sus festivos embebidos.

La API tendrá tres responsabilidades principales:

- validar si una fecha determinada es festiva;
- obtener la lista de festivos correspondiente a un año;
- crear, consultar, actualizar y eliminar tipos de festivo.

## Autores

- Juan David Velasquez Murillo
- Paula Andrea Calderon Quintero
- Jose David Vasquez Diaz

## Diagramas

| Diagrama | Descripción |
| --- | --- |
| [Modelo documental](./DiagramaModeloDocumental-Taller1.md) | Representa los documentos `Tipo` y los subdocumentos `Festivo` almacenados en MongoDB. |
| [Arquitectura por capas](./DiagramaArquitectura-Taller1.md) | Presenta los clientes, las capas de Express.js, la lógica de cálculo, el acceso a datos y MongoDB. |

## Decisiones principales

- Cada documento `Tipo` contiene un arreglo de festivos embebidos.
- La capa de servicios concentra el cálculo de Pascua y el traslado de fechas al lunes siguiente.
- El repositorio se limita a consultar y persistir documentos en MongoDB.
- La API 2, desarrollada con Spring Boot, consume la lista anual de festivos de esta API.

## Tecnologías modeladas

- Node.js
- Express.js
- MongoDB
- Mermaid

## Pruebas del núcleo de cálculo

El núcleo implementa las cuatro estrategias en UTC y calcula los festivos por año destino, incluidos desplazamientos que cruzan el límite anual. El catálogo inicial está en `datos/tipos.json`.

```bash
node --test test/festivo.servicio.test.js
```

## API HTTP

`crearApp(repositorio)` en `app.js` construye la aplicación Express con acceso a datos inyectable. Las pruebas usan un repositorio en memoria; la conexión persistente se incorpora en la siguiente unidad.

```bash
npm ci
npm test
```

Consultas: `GET /api/festivos/verificar/:anio/:mes/:dia` y `GET /api/festivos/obtener/:anio`. CRUD: `GET/POST /api/tipos` y `GET/PUT/DELETE /api/tipos/:indice`. Los índices 1–4 definen las estrategias; PUT reemplaza los campos editables y el arreglo de festivos. Las validaciones rechazan cuerpos inválidos y conservan los errores HTTP de entrada sin atribuirlos a MongoDB.
