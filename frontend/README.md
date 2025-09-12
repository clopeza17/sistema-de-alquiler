# Frontend - Sistema de Alquiler

Frontend del Sistema de Gestión de Alquiler de Apartamentos desarrollado con React.js, TypeScript y Tailwind CSS.

## 🚀 Características

- **React 18** con TypeScript
- **Vite** como herramienta de construcción
- **Tailwind CSS** para estilos
- **React Router** para manejo de rutas
- **React Hook Form** + **Zod** para formularios y validación
- **Zustand** para manejo de estado global
- **Axios** para peticiones HTTP
- **TanStack Query** para manejo de datos y caché
- **Day.js** para manejo de fechas
- **Sonner** para notificaciones
- **Lucide React** para iconos

## 📋 Prerrequisitos

- Node.js 18+ 
- npm o yarn

## 🛠️ Instalación

1. Clonar el repositorio
```bash
git clone <repositorio>
cd sistema-de-alquiler/frontend
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
```bash
cp .env.example .env
```

4. Iniciar el servidor de desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── api/                 # Configuración de API y endpoints
│   │   ├── http.ts        # Instancia de Axios con interceptores
│   │   └── endpoints.ts   # Definición de endpoints
│   ├── components/         # Componentes reutilizables
│   ├── pages/             # Páginas de la aplicación
│   │   └── Login/        # Página de inicio de sesión
│   ├── router/            # Configuración de rutas
│   ├── state/             # Manejo de estado global
│   │   └── authStore.ts  # Store de autenticación
│   ├── styles/            # Estilos globales
│   ├── utils/             # Utilidades y helpers
│   │   └── format.ts     # Funciones de formateo
│   ├── App.tsx           # Componente principal
│   └── main.tsx          # Punto de entrada
├── public/               # Archivos estáticos
├── index.html            # HTML principal
├── package.json          # Dependencias y scripts
├── vite.config.ts        # Configuración de Vite
├── tailwind.config.js    # Configuración de Tailwind
└── tsconfig.json        # Configuración de TypeScript
```

## 🔧 Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run preview` - Previsualizar build de producción
- `npm run lint` - Ejecutar linting

## 🎨 Estilos

El proyecto utiliza **Tailwind CSS** con una configuración personalizada:

- **Colores personalizados**: Primary (azul) y Secondary (gris)
- **Componentes reutilizables**: `.btn`, `.btn-primary`, `.btn-secondary`, `.input`, `.label`
- **Diseño responsive**: Mobile-first con breakpoints de Tailwind

## 🔐 Autenticación

El sistema incluye:

- **JWT Tokens**: Manejo seguro de tokens de acceso
- **Persistencia de sesión**: Almacenamiento en localStorage
- **Interceptores**: Manejo automático de tokens en peticiones
- **Protección de rutas**: Guards para rutas privadas
- **Manejo de errores**: Redirección automática en 401/403

## 🌐 Configuración de API

- **Base URL**: `/api/v1` (configurable en `.env`)
- **Timeout**: 10 segundos
- **Headers**: Content-Type: application/json
- **Interceptores**: 
  - Request: Agrega token Bearer
  - Response: Maneja 401/403 automáticamente

## 📱 Formateo

Utilidades para formato guatemalteco:

- **Moneda**: `formatCurrencyGTQ(amount)` → Q 1,000.00
- **Fechas**: `formatDateGT(date)` → dd/mm/aaaa
- **Números**: `formatNumberGT(number)` → 1,000

## 🚀 Despliegue

### Construcción para producción
```bash
npm run build
```

### Previsualización
```bash
npm run preview
```

## 🔧 Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_APP_NAME=Sistema de Alquiler
VITE_APP_VERSION=1.0.0
VITE_API_TIMEOUT=10000
VITE_TOKEN_REFRESH_THRESHOLD=300000
NODE_ENV=development
```

## 📝 Notas

- El frontend está configurado para funcionar con el backend en `http://localhost:8080`
- Las rutas de API están proxyadas a través de Vite en desarrollo
- El sistema de autenticación está listo para integrarse con el backend existente
- Los formularios incluyen validación en cliente y servidor

## 🤝 Contribución

1. Hacer fork del proyecto
2. Crear una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.
