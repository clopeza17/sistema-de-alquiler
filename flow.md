# 🌊 Diagrama de Flujo - Sistema de Alquiler

```mermaid
graph TD
    A[🚀 INICIO DEL PROYECTO] --> B[✅ Infraestructura Base]
    
    B --> B1[Docker + MySQL configurado]
    B --> B2[Esquema BD creado]
    B --> B3[Variables de entorno]
    B --> B4[Repositorio Git]
    
    B4 --> C[🔧 BACKEND SETUP]
    
    C --> C1[Estructura de proyecto]
    C --> C2[Dependencias instaladas]
    C --> C3[TypeScript configurado]
    C --> C4[Conexión MySQL]
    C --> C5[Sistema de logs]
    
    C5 --> D[🔐 AUTENTICACIÓN]
    
    D --> D1[JWT implementado]
    D --> D2[Hash contraseñas - bcrypt]
    D --> D3[Middleware Auth]
    D --> D4[RBAC - Roles]
    D --> D5[Auditoría]
    
    D5 --> E[👤 MÓDULO USUARIOS]
    
    E --> E1[Login/Logout]
    E --> E2[CRUD Usuarios]
    E --> E3[Gestión Roles]
    E --> E4[Activar/Desactivar]
    
    E4 --> F[🏠 MÓDULO PROPIEDADES]
    
    F --> F1[CRUD Propiedades]
    F --> F2[Gestión Imágenes]
    F --> F3[Estados: DISPONIBLE/OCUPADA]
    F --> F4[Filtros y búsqueda]
    
    F4 --> G[👥 MÓDULO INQUILINOS]
    
    G --> G1[CRUD Inquilinos]
    G --> G2[Búsqueda por nombre/doc]
    G --> G3[Validaciones únicas]
    
    G3 --> H[📄 MÓDULO CONTRATOS]
    
    H --> H1[Crear contrato]
    H --> H2[Validar propiedad DISPONIBLE]
    H --> H3[Renovar contrato]
    H --> H4[Finalizar contrato]
    H --> H5[Historial cambios]
    
    H5 --> I[💰 MÓDULO FACTURACIÓN]
    
    I --> I1[Generar facturas mensuales - SP]
    I --> I2[Estados automáticos]
    I --> I3[Listar por filtros]
    I --> I4[Anular facturas - ADMIN]
    
    I4 --> J[💳 MÓDULO PAGOS]
    
    J --> J1[Registrar pagos]
    J --> J2[Aplicar a facturas]
    J --> J3[Saldo no aplicado]
    J --> J4[Revertir aplicaciones]
    J --> J5[Triggers automáticos]
    
    J5 --> K[💸 MÓDULO GASTOS]
    
    K --> K1[CRUD Gastos fijos]
    K --> K2[Categorías por tipo]
    K --> K3[Filtros por propiedad/fecha]
    
    K3 --> L[🔧 MÓDULO MANTENIMIENTO]
    
    L --> L1[Tickets de soporte]
    L --> L2[Estados y prioridades]
    L --> L3[Seguimiento]
    
    L3 --> M[📊 MÓDULO REPORTES]
    
    M --> M1[Cuentas por cobrar]
    M --> M2[Rentabilidad propiedades]
    M --> M3[Estado ocupación]
    M --> M4[Exportación PDF/Excel]
    
    M4 --> N[🧪 TESTING BACKEND]
    
    N --> N1[Tests unitarios]
    N --> N2[Tests integración]
    N --> N3[Cobertura ≥70%]
    N --> N4[Datos semilla]
    
    N4 --> O[⚛️ FRONTEND SETUP]
    
    O --> O1[React + Vite]
    O --> O2[Dependencias UI]
    O --> O3[Tailwind CSS]
    O --> O4[TypeScript]
    O --> O5[Estructura carpetas]
    
    O5 --> P[🌐 CONFIGURACIÓN HTTP]
    
    P --> P1[Axios cliente]
    P --> P2[Interceptores JWT]
    P --> P3[Manejo errores]
    P --> P4[Estado global]
    
    P4 --> Q[🗺️ SISTEMA RUTAS]
    
    Q --> Q1[React Router]
    Q --> Q2[Rutas públicas/privadas]
    Q --> Q3[Guards Auth/RBAC]
    Q --> Q4[Página Login]
    
    Q4 --> R[🧩 COMPONENTES BASE]
    
    R --> R1[DataTable reutilizable]
    R --> R2[Formularios + validación]
    R --> R3[Modal genérico]
    R --> R4[DatePicker GT]
    R --> R5[Toast notifications]
    
    R5 --> S[📈 DASHBOARD]
    
    S --> S1[KPIs ocupación]
    S --> S2[Ingresos últimos 30d]
    S --> S3[Alertas vencidos]
    S --> S4[Gráficas Recharts]
    
    S4 --> T[🏠 UI PROPIEDADES]
    
    T --> T1[Lista con filtros]
    T --> T2[CRUD forms]
    T --> T3[Galería imágenes]
    T --> T4[Upload fotos]
    
    T4 --> U[👥 UI INQUILINOS]
    
    U --> U1[Lista + búsqueda]
    U --> U2[CRUD forms]
    U --> U3[Vista detalle]
    
    U3 --> V[📄 UI CONTRATOS]
    
    V --> V1[Wizard creación]
    V --> V2[Validaciones paso a paso]
    V --> V3[Acciones renovar/finalizar]
    V --> V4[Historial cambios]
    
    V4 --> W[💰 UI FACTURACIÓN]
    
    W --> W1[Lista facturas]
    W --> W2[Generar mensuales]
    W --> W3[Filtros estado/vencimiento]
    
    W3 --> X[💳 UI PAGOS]
    
    X --> X1[Registrar pagos]
    X --> X2[Aplicar a facturas]
    X --> X3[Mostrar saldos]
    X --> X4[Revertir aplicaciones]
    
    X4 --> Y[💸 UI GASTOS]
    
    Y --> Y1[Lista con filtros]
    Y --> Y2[CRUD forms]
    Y --> Y3[Categorización]
    
    Y3 --> Z[🔧 UI MANTENIMIENTO]
    
    Z --> Z1[Lista tickets]
    Z --> Z2[Crear solicitudes]
    Z --> Z3[Cambiar estados]
    
    Z3 --> AA[👤 UI USUARIOS - ADMIN]
    
    AA --> AA1[CRUD usuarios]
    AA --> AA2[Asignación roles]
    AA --> AA3[Activar/desactivar]
    
    AA3 --> BB[📊 UI REPORTES]
    
    BB --> BB1[Vistas reportes]
    BB --> BB2[Filtros fechas]
    BB --> BB3[Exportar PDF]
    BB --> BB4[Exportar Excel]
    
    BB4 --> CC[🧪 TESTING FRONTEND]
    
    CC --> CC1[Tests componentes]
    CC --> CC2[Tests integración]
    CC --> CC3[E2E opcionales]
    
    CC3 --> DD[🔒 SEGURIDAD FINAL]
    
    DD --> DD1[RBAC validado]
    DD --> DD2[Rate limiting]
    DD --> DD3[Validaciones completas]
    DD --> DD4[Headers seguridad]
    DD --> DD5[Auditoría activa]
    
    DD5 --> EE[📋 CALIDAD]
    
    EE --> EE1[ESLint + Prettier]
    EE --> EE2[Cobertura tests]
    EE --> EE3[Documentación API]
    EE --> EE4[Colección Postman]
    
    EE4 --> FF[🚀 DESPLIEGUE]
    
    FF --> FF1[Build optimizado]
    FF --> FF2[Variables producción]
    FF --> FF3[HTTPS configurado]
    FF --> FF4[Backup BD]
    FF --> FF5[Monitoreo logs]
    
    FF5 --> GG[✅ PROYECTO COMPLETADO]
    
    GG --> GG1[✨ Sistema funcionando]
    GG --> GG2[📚 Documentación completa]
    GG --> GG3[🔒 Seguridad validada]
    GG --> GG4[📊 Reportes exportando]
    GG --> GG5[👥 Usuario demo creado]

    %% Estilos
    classDef completed fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef inProgress fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    classDef pending fill:#6b7280,stroke:#4b5563,stroke-width:2px,color:#fff
    classDef critical fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff
    
    %% Marcar elementos completados
    class B1,B2,B3 completed
    
    %% Marcar siguiente paso
    class B4,C critical
    
    %% Marcar elementos pendientes principales
    class D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,AA,BB,CC,DD,EE,FF,GG pending
```

## 🎯 **Flujo de Desarrollo Recomendado**

### 📋 **Orden de Prioridades**:

1. **🔴 CRÍTICO** - Completar infraestructura base
2. **🟡 ALTA** - Backend core (auth, usuarios, propiedades, inquilinos)
3. **🟡 ALTA** - Frontend base (auth, componentes, propiedades)
4. **🟢 MEDIA** - Módulos de negocio (contratos, facturación, pagos)
5. **🟢 MEDIA** - Reportes y exportación
6. **🔵 BAJA** - Testing exhaustivo y optimizaciones

### 🚦 **Estados del Diagrama**:
- **🟢 Verde**: Completado
- **🟡 Amarillo**: En progreso
- **⚫ Gris**: Pendiente
- **🔴 Rojo**: Crítico/Bloqueante

### 📊 **Flujos de Datos Principales**:

```mermaid
graph LR
    A[Crear Propiedad] --> B[Registrar Inquilino]
    B --> C[Crear Contrato]
    C --> D[Generar Facturas]
    D --> E[Recibir Pagos]
    E --> F[Aplicar a Facturas]
    F --> G[Reportes]
```

### 🔄 **Flujo de Estados de Contrato**:

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE
    PENDIENTE --> ACTIVO : Activar
    ACTIVO --> FINALIZADO : Finalizar
    ACTIVO --> CANCELADO : Cancelar
    ACTIVO --> ACTIVO : Renovar
    FINALIZADO --> [*]
    CANCELADO --> [*]
```

### 💰 **Flujo de Facturación y Pagos**:

```mermaid
sequenceDiagram
    participant U as Usuario
    participant S as Sistema
    participant BD as Base Datos
    
    U->>S: Generar facturas mes
    S->>BD: sp_generar_facturas_mensuales()
    BD-->>S: Facturas creadas (ABIERTA)
    
    U->>S: Registrar pago
    S->>BD: INSERT pagos (saldo_no_aplicado = monto)
    
    U->>S: Aplicar pago a factura
    S->>BD: INSERT aplicaciones_pago
    BD->>BD: Trigger actualiza saldos
    BD-->>S: Factura estado actualizado
```
