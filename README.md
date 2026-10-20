# API de Festivos

API REST con **Express.js y MongoDB** para validar si una fecha es festiva, obtener los festivos de un año y realizar el **CRUD de tipos de festivo**. Cada documento `Tipo` conserva sus festivos embebidos, de acuerdo con los diagramas del proyecto.

## Autores

- Juan David Velasquez Murillo
- Paula Andrea Calderon Quintero
- Jose David Vasquez Diaz

## Ejecución local

Requisitos: Node.js 22.9 o superior, npm y MongoDB en ejecución. Para la prueba de integración también se necesita el ejecutable `mongod` disponible en `PATH`.

Desde la raíz de este repositorio:

```bash
npm ci
npm run seed
npm start
```

Por defecto se conecta a `mongodb://127.0.0.1:27017`, utiliza la base `festivos`, colección `tipos`, y escucha en `http://127.0.0.1:8080`. MongoDB debe iniciarse antes de cargar el catálogo; la API no lo instala ni inicia automáticamente.

Comprobar el ejemplo del profesor:

```bash
curl http://127.0.0.1:8080/api/festivos/verificar/2023/6/12
# Es Festivo
curl http://127.0.0.1:8080/api/festivos/obtener/2023
```

La carga inicial usa [datos/tipos.json](./datos/tipos.json): cuatro tipos y 19 festivos, incluido Domingo de Pascua, como aparece en la guía. `npm run seed` agrega únicamente los tipos faltantes: no duplica ni sobrescribe tipos existentes. Si se eliminó un tipo mediante el CRUD, ejecutar nuevamente la carga lo restaura.

### Configuración opcional

No se necesitan archivos `.env`. Las variables se leen del entorno del proceso:

| Variable | Valor predeterminado | Uso |
| --- | --- | --- |
| `PORT` | `8080` | Puerto HTTP, entre 1 y 65535. |
| `HOST` | `127.0.0.1` | Interfaz de escucha; acceso local por defecto. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | Conexión a MongoDB. |
| `MONGODB_DATABASE` | `festivos` | Nombre de la base. |

Ejemplo en Bash: `PORT=3000 MONGODB_DATABASE=festivos_desarrollo npm start`.

La conexión y el índice único de `indice` se verifican antes de escuchar solicitudes. Si MongoDB no está disponible, el arranque falla con código de salida 1. `npm run dev` reinicia la API al cambiar archivos. `Ctrl+C` cierra HTTP y la conexión a MongoDB.

## Endpoints

### Consultas de festivos

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/api/festivos/verificar/:anio/:mes/:dia` | Texto: `Es Festivo`, `No es festivo` o `Fecha No valida`. |
| GET | `/api/festivos/obtener/:anio` | JSON con objetos `{ "festivo": "Año nuevo", "fecha": "2023-01-01" }`, ordenados por fecha. |

Las rutas y respuestas siguen las capturas de la guía. La verificación devuelve HTTP 200 incluso para una fecha inválida, tal como en el ejemplo del profesor. En la lista anual, un año inválido devuelve HTTP 400. Los años admitidos son enteros entre 1 y 9999.

### CRUD de tipos

El identificador de las rutas es `indice` (1–4), no el `_id` de MongoDB.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/tipos` | 200: lista de tipos con sus festivos embebidos. |
| GET | `/api/tipos/:indice` | 200: tipo; 404 si no existe. |
| POST | `/api/tipos` | 201: tipo creado y cabecera `Location`; 409 si el índice ya existe. |
| PUT | `/api/tipos/:indice` | 200: tipo actualizado; 404 si no existe. |
| DELETE | `/api/tipos/:indice` | 204 sin cuerpo; 404 si no existe. |

Ejemplo de cuerpo JSON para crear o actualizar un tipo:

```json
{
  "indice": 1,
  "tipo": "Fijo",
  "modoCalcularlo": "No se puede variar",
  "festivos": [
    { "dia": 1, "mes": 1, "nombre": "Año nuevo" }
  ]
}
```

Ejemplo de actualización con el cuerpo anterior guardado en `tipo.json`:

```bash
curl -X PUT http://127.0.0.1:8080/api/tipos/1 \
  -H 'Content-Type: application/json' --data-binary @tipo.json
```

**La actualización envía todos los campos editables y reemplaza el arreglo completo `festivos`**; no es un PATCH ni un CRUD independiente de los festivos. No se envía `_id`: MongoDB lo genera y la actualización lo conserva. El índice del cuerpo debe coincidir con el de la ruta, porque determina la estrategia de cálculo.

Eliminar un tipo elimina también sus festivos embebidos. Las consultas siguientes reflejan inmediatamente los cambios del catálogo; si está vacío, la lista anual será `[]` y ninguna fecha válida será festiva. La API no repone los tipos automáticamente.

### Validaciones y errores

- Solo se admiten índices 1–4, únicos, que corresponden a las cuatro estrategias del modelo. Crear permite reponer un tipo faltante; no definir algoritmos adicionales.
- `tipo`, `modoCalcularlo` y `nombre` deben ser textos no vacíos de hasta 500 caracteres.
- `festivos` debe ser un arreglo; puede estar vacío.
- Tipos 1–2: cada festivo requiere `nombre`, `dia` y `mes` con una fecha posible. Se admite 29 de febrero, pero solo se genera en años bisiestos.
- Tipos 3–4: cada festivo requiere `nombre` y `diasPascua`, entero entre -366 y 366, incluido cero. La lista solo incluye fechas del año solicitado.
- No se admiten campos desconocidos, operadores MongoDB ni campos de otra estrategia en el cuerpo.
- Cuerpo, URI o parámetros inválidos: 400; JSON de más de 100 kB: 413; charset o compresión no admitidos: 415; ruta inexistente: 404; fallo de persistencia: 503, sin exponer credenciales ni detalles internos.

Estas validaciones son decisiones técnicas de la implementación. La API está destinada al entorno académico local: no incluye autenticación ni autorización; no debe exponerse públicamente sin añadir esos controles.

## Diagramas y arquitectura

| Diagrama | Descripción |
| --- | --- |
| [Modelo documental](./DiagramaModeloDocumental-Taller1.md) | Documentos `Tipo` y subdocumentos `Festivo` almacenados en MongoDB. |
| [Arquitectura por capas](./DiagramaArquitectura-Taller1.md) | Clientes, presentación, negocio, acceso a datos y persistencia. |

| Capa | Archivos | Responsabilidad |
| --- | --- | --- |
| Presentación | `server.js`, `app.js`, `rutas/`, `validadores/` | Entrada HTTP, rutas y validación de parámetros y cuerpos. |
| Negocio | `controladores/`, `servicios/` | Coordinar casos de uso, calcular festivos y gestionar tipos. |
| Acceso a datos | `repositorios/festivo.repositorio.js` | Consultar y persistir documentos `Tipo`. |
| Persistencia | MongoDB, colección `tipos` | Conservar documentos con arreglo `festivos` e índice único `indice`. |

`configuracion/bd.config.js` y `modelos/bd.js` configuran y abren la conexión; `scripts/cargar-festivos.js` realiza la carga inicial separada de las solicitudes HTTP.

## Decisiones de cálculo

- Tipos 1 y 2 parten de `dia` y `mes`; tipos 3 y 4, de Pascua más `diasPascua`.
- Tipos 2 y 4 se trasladan al lunes siguiente, conservando la fecha cuando ya es lunes.
- Si un desplazamiento cruza el límite anual, el festivo aparece en el año de la fecha resultante. Por ejemplo, un festivo tipo 2 configurado para el 31 de diciembre de 2023 se incluye el 1 de enero de 2024, no desaparece al cambiar de año.
- Se trabaja en UTC para que la zona horaria no cambie las fechas. El calendario es gregoriano, extendido a los años anteriores a su adopción.
- Pascua usa la fórmula de Gauss de la guía: Ramos desde el 15 de marzo y Pascua siete días después. Se incorporan constantes por siglo y correcciones excepcionales de Gauss para evitar errores como los de 1954, 1981, 2049 y 2076; son ajustes técnicos respecto a la fórmula simplificada del documento.
- La API 2 con Spring Boot consumirá la lista anual; no se implementa en este repositorio.

## Pruebas

```bash
npm test
npm run test:integration
```

`npm test` verifica cálculo, fechas bisiestas, cruces anuales, contratos HTTP, CRUD, validaciones y errores con un repositorio en memoria, incluidos errores de URI y formatos no admitidos. `npm run test:integration` inicia su propio `mongod` en un puerto y directorio temporales, prueba persistencia, carga repetida y creación concurrente, y lo elimina al terminar. No usa ni borra la base de desarrollo.

## Tecnologías

Node.js, Express.js 5, controlador oficial MongoDB 6, pruebas nativas `node:test` y diagramas Mermaid.
