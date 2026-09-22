# API de Festivos — Taller 1

Modelado de la **API 1 del Taller 1 de Arquitectura de Software II**. La solución propuesta utiliza **Express.js** para la API REST y **MongoDB** para almacenar los tipos de cálculo con sus festivos embebidos.

La API tendrá dos responsabilidades principales:

- validar si una fecha determinada es festiva;
- obtener la lista de festivos correspondiente a un año.

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
