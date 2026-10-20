# Diagrama de arquitectura por capas — API de Festivos

```mermaid
graph TD
    %% Capa de Cliente
    subgraph ClientLayer["Capa de Cliente"]
        Client["Web / Móvil / Postman / Swagger UI"]
    end

    %% Capa de Presentación / API
    subgraph PresentationLayer["Capa de Presentación / API"]
        Index["Index<br/>server.js / app.js"]
        Routes["Rutas de Festivos y Tipos<br/>festivo.rutas.js, tipo.rutas.js"]
        Validator["Validadores de Festivos y Tipos<br/>festivo.validador.js, tipo.validador.js"]
    end

    %% Capa de Lógica de Negocio
    subgraph BusinessLayer["Capa de Lógica de Negocio"]
        Controller["Controladores de Festivos y Tipos<br/>festivo.controlador.js, tipo.controlador.js"]
        Service["Servicios de Festivos y Tipos<br/>festivo.servicio.js<br/>Valida fechas, calcula Pascua, aplica Ley de Puente y genera la lista anual<br/>tipo.servicio.js: gestiona el CRUD de tipos"]
    end

    %% Capa de Acceso a Datos
    subgraph DataAccessLayer["Capa de Acceso a Datos"]
        Repository["Repositorio de Festivos<br/>festivo.repositorio.js<br/>Consulta y realiza el CRUD de documentos Tipo"]
    end

    %% Capa de Persistencia
    subgraph PersistenceLayer["Capa de Persistencia"]
        MongoDB[("MongoDB<br/>Documentos Tipo con Festivo embebido")]
    end

    Client -->|"1. Petición HTTP"| Index
    Index -->|"2. Dirige la petición"| Routes
    Routes -->|"3. Valida los parámetros"| Validator
    Validator -->|"4. Envía datos validados"| Controller
    Controller -->|"5. Solicita reglas de negocio"| Service
    Service -->|"6. Consulta o modifica documentos Tipo"| Repository
    Repository -->|"7. Consulta o modifica MongoDB"| MongoDB

    MongoDB -.->|"8. Documentos Tipo"| Repository
    Repository -.->|"9. Datos de festivos"| Service
    Service -.->|"10. Resultado de negocio"| Controller
    Controller -.->|"11. Resultado"| Routes
    Routes -.->|"12. Respuesta"| Index
    Index -.->|"13. Respuesta HTTP / JSON"| Client

    style ClientLayer fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style PresentationLayer fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style BusinessLayer fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style DataAccessLayer fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style PersistenceLayer fill:#ffebee,stroke:#d32f2f,stroke-width:2px
```

La presentación recibe la petición y valida sus parámetros; el controlador, ubicado con el servicio en la lógica de negocio, coordina el caso de uso. El servicio de festivos conserva las reglas de fechas y la generación anual. El servicio de tipos gestiona la creación, consulta, actualización y eliminación de los tipos de festivo. El repositorio consulta y persiste los documentos `Tipo` con los `Festivo` embebidos en MongoDB.
