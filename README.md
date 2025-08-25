# Image Batch Processor

🎨 **Aplicación web moderna para procesamiento de imágenes en lote con privacidad total**

Procesa hasta 20 imágenes con rotación automática, recorte inteligente y redimensionado, todo ejecutándose **100% en tu navegador**. Sin servidores, sin uploads, máxima privacidad.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tu-usuario/image-processor)

## ✨ Características Principales

### 🔒 **Privacidad Total**
- 🔥 **Procesamiento 100% local** en tu navegador
- 🚫 **Cero uploads** por defecto - tus imágenes nunca salen de tu dispositivo
- ✅ **Almacenamiento temporal opcional** (solo 1 muestra, 24h) con consentimiento explícito
- 🛡️ **Cumple GDPR/CCPA** - transparencia total

### 🎨 **Procesamiento iPhone-Style**
- 🔄 **Rotación con recorte geométrico determinista** - elimina bordes 100% garantizado
- 🆕 **Algoritmo geométrico** - cálculo matemático preciso del rectángulo inscrito máximo
- 🆕 **Cero escaneo de píxeles** - basado en geometría pura, más rápido y determinista
- 🛡️ **Margen de seguridad configurable** - 1-2px ajustable para casos edge
- ✂️ **Recorte lateral opcional** después de rotación  
- 📏 **Redimensionado** con conservación de proporción
- 🎯 **Multi-formato** (JPEG, PNG, WebP) con control de calidad
- 📸 **Preservación EXIF** configurable

### 🌟 **UX Moderna**
- 🎯 **Drag & Drop** profesional para hasta 20 imágenes
- 🌙 **Tema oscuro permanente** con diseño minimalista profesional
- 👀 **Vista previa comparativa** con slider antes/después interactivo
- 📦 **Descarga ZIP** con nomenclatura secuencial perfecta
- ⚡ **Progreso en tiempo real** con micro-animaciones fluidas
- ⌨️ **Atajos de teclado** para rotación y acciones rápidas

### 🚀 **Performance**
- ⚡ **Web Workers** - procesamiento sin lag
- 🔧 **Canvas API** optimizado para alta calidad
- 💾 **Gestión de memoria** eficiente para archivos grandes

---

## 🎨 Diseño UI/UX

### ✨ **Filosofía de Diseño**
- **Minimalismo profesional**: Estética limpia y enfocada
- **Tema oscuro permanente**: Optimizado para trabajo prolongado
- **Tipografía geométrica**: Inter Tight para máxima legibilidad

### 🌈 **Paleta de Colores**
```css
/* Base Colors */
--bg: #0B0F19          /* Fondo principal casi negro */
--surface: #111827      /* Superficies (cards, panels) */
--muted: #1F2937        /* Elementos deshabilitados */
--border: rgba(255,255,255,0.06)  /* Bordes sutiles */

/* Text Colors */
--text-primary: #E5E7EB  /* Texto principal */
--text-muted: #9CA3AF    /* Texto secundario */

/* Accent Gradient */
--accent-from: #7C3AED   /* Violeta */
--accent-to: #06B6D4     /* Cyan */
```

### 🎬 **Micro-Animaciones**
- **Framer Motion**: Transiciones fluidas y naturales
- **Hover/Press**: Feedback táctil en botones (scale, shadow, translate)
- **Stagger**: Aparición secuencial de elementos con 40ms delay
- **Easing**: Curva cubic-bezier optimizada para UI ([0.25, 0.46, 0.45, 0.94])

### ⌨️ **Atajos de Teclado**
- `R` / `L`: Rotar ±1°
- `Shift + R` / `Shift + L`: Rotar ±5°
- `Ctrl/Cmd + S`: Descargar resultados
- `Tab` / `Shift + Tab`: Navegación por controles

### 📱 **Diseño Responsivo**
- **Mobile First**: Layout de columna única en pantallas < 1024px
- **Desktop**: Dos columnas (herramientas + preview)
- **Containers**: Max-width 1280px con padding adaptativo

### 🎯 **Componentes UI**

#### Button Variants
```tsx
<Button variant="primary" size="xl">     // Gradiente principal con glow
<Button variant="secondary" size="lg">   // Superficie con borde
<Button variant="ghost" size="default">  // Transparente con hover
<Button variant="outline" size="sm">     // Solo borde
```

#### Panel System
```tsx
<Panel delay={0.1}>                      // Card animado con retraso
<EditorLayout leftPanel={} rightPanel={}/> // Layout dos columnas
<PreviewCompare beforeImage={} afterImage={}/> // Comparador interactivo
```

---

## 🧠 Algoritmo de Recorte Geométrico Determinista

### ✨ Características Revolucionarias
- **Recorte geométrico puro**: Sin escaneo de píxeles - cálculo matemático directo
- **Rectángulo inscrito máximo**: Fórmula matemática que garantiza el área máxima sin bordes
- **Margen de seguridad "shave"**: 0-5px configurable para eliminación total de bordes
- **Determinista 100%**: Misma entrada = misma salida siempre
- **Zero bordes garantizado**: Para PNG y JPEG en cualquier ángulo de rotación
- **Pipeline optimizado**: Decodificar → Rotar → Calcular → Recortar → Exportar

### 🔧 Fórmula Matemática
```javascript
// Para un rectángulo (w0, h0) rotado θ grados:
const factor = Math.min(
  w0 / (w0 * cos(θ) + h0 * sin(θ)),
  h0 / (w0 * sin(θ) + h0 * cos(θ))
)
inscribed_w = w0 * factor - (shave * 2)
inscribed_h = h0 * factor - (shave * 2)
```

### ⚙️ Configuración
- **Modo geométrico**: Habilitado por defecto (recomendado)
- **Margen de seguridad**: 1px por defecto (0-5px ajustable)
- **Modo legacy**: Alpha-based disponible para compatibilidad

### 🧪 Modo Debug
- **Overlay de bounding box**: Visualiza el área recortada en verde
- **Máscara alpha**: Resalta píxeles transparentes en rojo
- **Controles de debug**: Ajuste en tiempo real de threshold y overcrop
- **Batería de pruebas**: Test automático con múltiples ángulos (1°, 5°, 12°, 17°, 23°, 37°, 45°, 61°, 89°)

### 🎯 Resultado
- ✅ **Imágenes perfectamente rectangulares** después de rotación
- ✅ **Sin bordes blancos o transparentes** visibles
- ✅ **Máximo aprovechamiento del contenido** real
- ✅ **Funciona con cualquier ángulo** de rotación

---

## 🚀 Inicio Rápido

### Desarrollo Local

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd image-processor
npm install

# 2. Ejecutar en desarrollo
npm run dev

# 3. Abrir http://localhost:3000
```

### Despliegue en Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Configurar variables de entorno (opcional para S3)
vercel env add S3_ACCESS_KEY
vercel env add S3_SECRET_KEY  
vercel env add S3_BUCKET
vercel env add S3_REGION
vercel env add ADMIN_TOKEN

# 3. Desplegar
vercel
```

---

## ⚙️ Configuración

### Variables de Entorno

Copia `.env.example` a `.env.local`:

```bash
# S3 Configuration (opcional - solo para almacenamiento temporal)
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ENDPOINT=                          # Opcional para servicios S3-compatible

# Admin Panel
ADMIN_TOKEN=your_secure_admin_token   # Para acceso a /admin
```

### Configuración S3 (Obligatorio para muestras)

**Necesario para el almacenamiento automático de muestras para mejorar el servicio**

#### AWS S3 Setup:

**1. Crear bucket:**
```bash
aws s3 mb s3://imagesv0.1 --region eu-north-1
```

**2. Configurar CORS para PUT desde navegador:**
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["Content-Type", "x-amz-acl", "x-amz-date", "x-amz-content-sha256", "Authorization"],
      "AllowedMethods": ["PUT"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

**3. Configurar Lifecycle Rule (auto-borrado 24h):**
```json
{
  "Rules": [
    {
      "ID": "DeleteSamples24h",
      "Status": "Enabled",
      "Filter": { "Prefix": "samples/" },
      "Expiration": { "Days": 1 }
    }
  ]
}
```

**4. Configurar IAM Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::imagesv0.1/samples/*"
    }
  ]
}
```

**5. Variables de entorno requeridas:**
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-north-1
S3_BUCKET=imagesv0.1
```

#### Alternativas S3-Compatible:

| Servicio | S3_ENDPOINT |
|----------|-------------|
| **MinIO** | `http://localhost:9000` |
| **DigitalOcean Spaces** | `https://fra1.digitaloceanspaces.com` |
| **Cloudflare R2** | `https://account.r2.cloudflarestorage.com` |
| **Backblaze B2** | `https://s3.us-west-004.backblazeb2.com` |

---

## 🏗️ Arquitectura

### Frontend (100% Client-Side)
```typescript
Next.js 14 + TypeScript + Tailwind CSS
├── app/                    # App Router (Next.js 13+)
│   ├── page.tsx           # Página principal
│   ├── admin/             # Panel administración  
│   ├── terms/             # Términos legales
│   └── privacy/           # Política privacidad
├── components/            # Componentes React
│   ├── ui/               # shadcn/ui base
│   ├── image-uploader.tsx # Drag & drop
│   ├── processing-options.tsx
│   └── consent-banner.tsx # Banner privacidad
└── workers/              # Web Workers
    └── image-processor.worker.ts # Procesamiento
```

### Backend API (Opcional)
```typescript  
├── app/api/              # Serverless APIs
│   ├── temp-upload/      # POST - Subida temporal
│   ├── temp-list/        # GET  - Listar (admin)
│   └── temp-delete/      # DEL  - Eliminar (admin)
```

### Procesamiento de Imágenes

#### 🎯 Pipeline Sin Fondos Blancos (iPhone-style)

**Orden estricto para eliminar márgenes/fondos:**
```
EXIF → Rotar (canvas transparente) → autoCropByAlpha → Crop lateral → Resize → Export
```

**⚠️ CRÍTICO - Motivo técnico del autocrop antes de JPEG:**

JPEG **no tiene canal alfa** (transparencia). Si exportamos a JPEG antes del autocrop, el navegador automáticamente:
1. 🔴 **Rellena áreas transparentes con BLANCO**
2. 🔴 **Genera los bordes/marcos no deseados**  
3. 🔴 **Hace imposible el recorte posterior**

**✅ Solución:** Autocrop SIEMPRE debe aplicarse en canvas con alfa, ANTES de convertir a JPEG.

#### 🔧 Implementación Técnica - autoCropByAlpha()

- **Función unificada**: `autoCropByAlpha(canvas, threshold=0)` en `utils/image.ts`
- **Detección precisa**: Escanea pixel por pixel buscando `alpha > threshold`
- **Bounding box mínimo**: Calcula rectángulo exacto que contiene píxeles válidos
- **Canvas recortado**: Crea nuevo canvas solo con la región útil
- **Fallback seguro**: Si no encuentra contenido, devuelve canvas original (sin crashes)

#### 🧮 Algoritmo de Recorte

```typescript
// 1. Escanear todos los píxeles
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const alpha = imageData[pixelIndex + 3]
    if (alpha > threshold) {
      // Actualizar bounding box
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      // ...
    }
  }
}

// 2. Crear canvas recortado
const croppedCanvas = new OffscreenCanvas(width, height)
croppedCtx.drawImage(original, minX, minY, width, height, 0, 0, width, height)
```

#### 🔍 Debug y QA

**En desarrollo (localhost):**
- **Logs detallados** del pipeline con tiempos de ejecución
- **Visualización de máscara alpha** (rojo = áreas transparentes) con `options.debugMode = true`
- **Verificación automática** de que no hay export temprano a JPEG
- **Información de bounding box** y porcentaje de reducción
- **Fallback tracking** cuando el autocrop no puede proceder

**Activar modo debug:**
```javascript
// En options del worker
const options = {
  rotation: 15,
  format: 'png',
  debugMode: true  // Solo en localhost
}
```

**Compatibilidad:**
- **Entrada**: JPG, PNG, WEBP
- **Salida**: JPG (con fondo blanco final), PNG/WEBP (mantienen alfa)
- **Web Workers** para no bloquear UI
- **OffscreenCanvas** para mejor rendimiento

---

## 🔒 Privacidad y Transparencia

### Por Defecto (Sin Consentimiento)
- ✅ **Todo local** - procesamiento 100% en el navegador
- ✅ **Cero network** - ni una imagen sale de tu dispositivo  
- ✅ **Sin cookies** de tracking
- ✅ **Sin logs** de actividad

### Con Consentimiento Explícito
- 📤 **Solo 1 imagen** por lote (muestra) se sube temporalmente
- ⏰ **24 horas máximo** de retención automática
- 🗑️ **Auto-eliminación** garantizada vía S3 Lifecycle
- 🔐 **Cero datos personales** - solo imagen + timestamp + batchId

### Cumplimiento Legal
- **GDPR**: Consentimiento explícito + eliminación automática + transparencia
- **CCPA**: Sin venta de datos + control total del usuario
- **Páginas legales**: Terms & Privacy integradas

---

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
npm run dev      # Desarrollo con hot reload
npm run build    # Build para producción  
npm run start    # Servidor producción
npm run lint     # Linting con ESLint
npm test         # Tests unitarios
```

### Estructura de Archivos

```
image-processor/
├── app/                    # Next.js App Router
├── components/            # Componentes React
├── lib/                   # Utilidades
├── workers/              # Web Workers  
├── public/               # Assets estáticos
├── legacy/               # Aplicación desktop anterior
├── package.json          # Dependencias
├── next.config.js        # Configuración Next.js
├── tailwind.config.js    # Configuración Tailwind
├── tsconfig.json         # Configuración TypeScript
└── .env.example          # Variables de entorno
```

### Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| **Framework** | Next.js 14 + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Icons** | Lucide React |
| **Storage** | AWS S3 / S3-compatible |
| **Processing** | Canvas API + Web Workers |
| **Deployment** | Vercel (recomendado) |

---

## 👨‍💼 Panel de Admin

### Acceso
- **URL**: `https://tu-dominio.com/admin`
- **Auth**: Token configurado en `ADMIN_TOKEN`

### Funcionalidades
- 👀 **Visualizar** todas las imágenes temporalmente almacenadas
- 🗑️ **Eliminar** objetos individualmente  
- ⏰ **Monitorear** expiración automática (24h)
- 📊 **Estadísticas** básicas de uso

### Seguridad
- 🔐 **Autenticación** por token seguro
- 🛡️ **Solo acceso** a objetos `temp/`
- 🔗 **URLs firmadas** temporalmente (1h)
- 🚫 **Sin exposición** de datos sensibles

---

## 🚀 Despliegue en Producción

### Opción 1: Vercel (Recomendado)

```bash
# Automático desde GitHub
1. Conectar repo a Vercel
2. Configurar variables de entorno
3. Deploy automático en cada push

# Manual
vercel --prod
```

### Opción 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Opción 3: Netlify

```bash
# Build command: npm run build
# Publish directory: .next
# Functions directory: app/api
```

---

## 🔧 Personalización

### Límites de Archivos

```typescript
// En components/image-uploader.tsx
const MAX_FILES = 20
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB
```

### Formatos Soportados

```typescript
// En lib/utils.ts
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp']
```

### Algoritmo de Rotación

```typescript
// En workers/image-processor.worker.ts
function calculateInscribedRectangle(width, height, angle) {
  // Implementación matemática del rectángulo inscrito
  // Evita bordes negros/blancos como iPhone
}
```

---

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests específicos
npm test -- --testNamePattern="rotation"
npm test -- --testPathPattern="worker"

# Coverage
npm test -- --coverage
```

---

## 📈 Monitoreo

### Métricas Recomendadas
- ✅ Lotes procesados exitosamente
- ⚡ Tiempo promedio de procesamiento  
- 📊 Distribución de formatos de salida
- 🔒 Tasa de consentimiento para almacenamiento temporal

### Logs en Vercel
```bash
vercel logs --follow
```

---

## 🆘 Troubleshooting

### Problema: Worker no funciona
**Solución**: Verificar que el navegador soporte Web Workers y Canvas API

### Problema: Rotación no auto-crop
**Solución**: Revisar algoritmo de inscribed rectangle en el worker

### Problema: Admin panel no accesible  
**Solución**: Verificar `ADMIN_TOKEN` en variables de entorno

### Problema: S3 upload falla
**Solución**: Verificar credenciales S3 y permisos del bucket

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

---

## 🌟 Créditos

- Inspirado en la galería de fotos de iPhone para rotación inteligente
- UI/UX basado en Fluent Design y Material Design
- Construido con ❤️ para máxima privacidad del usuario

---

**🔒 Tu privacidad es nuestra prioridad absoluta. Esta app está diseñada para nunca necesitar acceso a tus imágenes, procesando todo localmente por defecto.**