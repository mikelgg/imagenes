/**
 * Utilidades para procesamiento de imágenes
 * Funciones reutilizables para auto-recorte, análisis de píxeles, etc.
 */

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface AutoCropResult {
  success: boolean
  boundingBox: BoundingBox
  canvas?: OffscreenCanvas
  debugInfo?: any
}

/**
 * Auto-recorte basado en píxeles con alpha > umbral
 * Encuentra el bounding box mínimo que contiene píxeles no-transparentes
 * 
 * @param input - Canvas o ImageBitmap de entrada
 * @param threshold - Umbral de alpha (por defecto 0 = cualquier pixel no completamente transparente)
 * @param isRotated - Si la imagen fue rotada (aplica algoritmo más agresivo)
 * @returns Resultado del auto-recorte con canvas recortado
 */
export function autoCropByAlpha(
  input: OffscreenCanvas | ImageBitmap, 
  threshold: number = 0,
  isRotated: boolean = false,
  rotationAngle?: number
): AutoCropResult {
  try {
    // Crear canvas temporal si la entrada es ImageBitmap
    let sourceCanvas: OffscreenCanvas
    
    if (input instanceof ImageBitmap) {
      sourceCanvas = new OffscreenCanvas(input.width, input.height)
      const ctx = sourceCanvas.getContext('2d')
      if (!ctx) {
        throw new Error('No se pudo obtener contexto 2D')
      }
      ctx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height)
      ctx.drawImage(input, 0, 0)
    } else {
      sourceCanvas = input
    }

    const ctx = sourceCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('No se pudo obtener contexto 2D del canvas')
    }

    // Obtener datos de imagen
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const data = imageData.data
    
    // Calcular bounding box de píxeles con alpha > threshold
    let boundingBox = calculateAlphaBoundingBox(data, sourceCanvas.width, sourceCanvas.height, threshold, isRotated)
    
    if (!boundingBox) {
      // No se encontró contenido válido - devolver canvas original como fallback seguro
      return {
        success: false,
        boundingBox: { x: 0, y: 0, width: sourceCanvas.width, height: sourceCanvas.height },
        canvas: sourceCanvas,
        debugInfo: { reason: 'No content found', threshold, isRotated }
      }
    }

    // NOTA: La función calculateInscribedRectangle ahora está obsoleta
    // El nuevo pipeline geométrico está implementado en el worker
    // Esta función se mantiene para compatibilidad con alpha-based cropping
    if (isRotated && rotationAngle) {
      // Usar directamente la fórmula matemática que funciona en el script Python
      boundingBox = calculateInscribedRectangle(sourceCanvas.width, sourceCanvas.height, rotationAngle)
    }

    // Crear canvas recortado
    const croppedCanvas = new OffscreenCanvas(boundingBox.width, boundingBox.height)
    const croppedCtx = croppedCanvas.getContext('2d')
    if (!croppedCtx) {
      throw new Error('No se pudo crear contexto para canvas recortado')
    }

    // Copiar solo la región del bounding box
    croppedCtx.clearRect(0, 0, boundingBox.width, boundingBox.height)
    croppedCtx.drawImage(
      sourceCanvas,
      boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height,
      0, 0, boundingBox.width, boundingBox.height
    )

    const reduction = 1 - (boundingBox.width * boundingBox.height) / (sourceCanvas.width * sourceCanvas.height)

    return {
      success: true,
      boundingBox,
      canvas: croppedCanvas,
      debugInfo: {
        originalSize: `${sourceCanvas.width}x${sourceCanvas.height}`,
        croppedSize: `${boundingBox.width}x${boundingBox.height}`,
        reduction: `${Math.round(reduction * 100)}%`,
        threshold,
        isRotated
      }
    }
    
  } catch (error) {
    console.error('Error en autoCropByAlpha:', error)
    
    // Fallback seguro - devolver canvas original
    const fallbackCanvas = input instanceof ImageBitmap 
      ? createCanvasFromImageBitmap(input)
      : input
      
    return {
      success: false,
      boundingBox: { x: 0, y: 0, width: fallbackCanvas.width, height: fallbackCanvas.height },
      canvas: fallbackCanvas,
      debugInfo: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

/**
 * Calcula el bounding box mínimo de píxeles de contenido real
 * Algoritmo mejorado para eliminar completamente las esquinas vacías después de rotación
 */
function calculateAlphaBoundingBox(
  data: Uint8ClampedArray, 
  width: number, 
  height: number, 
  threshold: number,
  isRotated: boolean = false
): BoundingBox | null {
  
  // PASO 1: Análisis inicial para determinar el tipo de imagen y contenido
  const edgeData = analyzeImageEdges(data, width, height)
  
  let minX = width, minY = height, maxX = -1, maxY = -1

  // PASO 2: Algoritmo de detección adaptativo según el tipo de contenido
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1] 
      const b = data[pixelIndex + 2]
      const alpha = data[pixelIndex + 3]
      
      // CRITERIO 1: Píxeles completamente transparentes = definitivamente fondo
      if (alpha <= threshold) continue
      
      // CRITERIO 2: Píxeles muy transparentes por interpolación
      if (alpha < 50) continue
      
      // CRITERIO 3: Detección mejorada de píxeles de borde/interpolación
      const isEdgePixel = detectEdgePixel(r, g, b, alpha, x, y, width, height, edgeData)
      if (isEdgePixel) continue
      

      

      
      // PÍXEL VÁLIDO: Incluir en el bounding box
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  // Si no se encontraron píxeles válidos
  if (maxX === -1 || maxY === -1) {
    return null
  }

  // PASO 3: Aplicar margen de seguridad mínimo para evitar cortar contenido real
  const finalBounds = applySecurityMargin({
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  }, width, height)

  return finalBounds
}

/**
 * Analiza los bordes de la imagen para detectar patrones de rotación
 */
function analyzeImageEdges(data: Uint8ClampedArray, width: number, height: number) {
  const edgePixels: Array<{r: number, g: number, b: number, alpha: number}> = []
  const borderWidth = Math.min(20, Math.floor(Math.min(width, height) * 0.05))
  
  // Analizar píxeles del borde para detectar colores típicos de interpolación
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x < borderWidth || x >= width - borderWidth || 
                     y < borderWidth || y >= height - borderWidth
      
      if (isEdge) {
        const pixelIndex = (y * width + x) * 4
        edgePixels.push({
          r: data[pixelIndex],
          g: data[pixelIndex + 1],
          b: data[pixelIndex + 2],
          alpha: data[pixelIndex + 3]
        })
      }
    }
  }
  
  // Calcular estadísticas de los bordes
  const avgEdgeColor = edgePixels.reduce((acc, pixel) => ({
    r: acc.r + pixel.r,
    g: acc.g + pixel.g,
    b: acc.b + pixel.b,
    alpha: acc.alpha + pixel.alpha
  }), {r: 0, g: 0, b: 0, alpha: 0})
  
  if (edgePixels.length > 0) {
    avgEdgeColor.r /= edgePixels.length
    avgEdgeColor.g /= edgePixels.length
    avgEdgeColor.b /= edgePixels.length
    avgEdgeColor.alpha /= edgePixels.length
  }
  
  return {
    avgEdgeColor,
    hasTransparentEdges: avgEdgeColor.alpha < 100,
    hasLightEdges: avgEdgeColor.r > 200 && avgEdgeColor.g > 200 && avgEdgeColor.b > 200
  }
}

/**
 * Detecta si un píxel es probablemente resultado de interpolación de bordes
 */
function detectEdgePixel(
  r: number, g: number, b: number, alpha: number,
  x: number, y: number, width: number, height: number,
  edgeData: any
): boolean {
  
  // 1. Píxeles con alpha muy bajo son claramente de borde
  if (alpha < 100) return true
  
  // 2. Si la imagen tiene bordes transparentes y este píxel está cerca del borde
  if (edgeData.hasTransparentEdges) {
    const distanceFromEdge = Math.min(x, y, width - 1 - x, height - 1 - y)
    const maxDistanceToConsider = Math.min(40, Math.floor(Math.min(width, height) * 0.12))
    
    if (distanceFromEdge < maxDistanceToConsider) {
      // Píxel cerca del borde con alpha bajo-medio = probablemente interpolación
      if (alpha < 180) return true
      
      // Colores muy claros cerca del borde = probablemente interpolación
      if (r > 230 && g > 230 && b > 230) return true
    }
  }
  
  // 3. Colores extremadamente claros/blancos con cualquier nivel de transparencia
  if (r > 245 && g > 245 && b > 245 && alpha < 255) return true
  
  // 4. Colores beige/amarillentos típicos de interpolación sobre fondos claros
  if (r > 235 && g > 230 && b > 210 && alpha < 240 && Math.abs(r - g) < 20) return true
  
  // 5. Grises muy claros con transparencia parcial
  if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 235 && alpha < 220) return true
  
  return false
}



/**
 * Aplica un margen de seguridad mínimo para evitar cortar contenido real
 */
function applySecurityMargin(bounds: BoundingBox, canvasWidth: number, canvasHeight: number): BoundingBox {
  // Margen de seguridad: 1-2 píxeles para evitar cortar líneas finas
  const margin = 2
  
  return {
    x: Math.max(0, bounds.x - margin),
    y: Math.max(0, bounds.y - margin),
    width: Math.min(canvasWidth - Math.max(0, bounds.x - margin), bounds.width + margin * 2),
    height: Math.min(canvasHeight - Math.max(0, bounds.y - margin), bounds.height + margin * 2)
  }
}



/**
 * Calcula el rectángulo inscrito más grande usando la fórmula matemática exacta del legacy
 * Esta es la misma lógica que funciona correctamente en el script Python
 */
function calculateInscribedRectangle(width: number, height: number, rotationAngle?: number): BoundingBox {
  
  // Si no hay ángulo de rotación específico, usar factor conservador
  if (!rotationAngle || rotationAngle === 0) {
    return calculateConservativeRectangle(width, height)
  }
  
  // Para rotaciones que no son múltiplos de 90°, usar la fórmula matemática exacta del legacy
  const angleRad = Math.abs(rotationAngle * Math.PI / 180)
  const cosA = Math.abs(Math.cos(angleRad))
  const sinA = Math.abs(Math.sin(angleRad))
  
  // Fórmula matemática exacta del legacy para el rectángulo inscrito más grande
  if (cosA + sinA === 0) {
    return calculateConservativeRectangle(width, height)
  }
  
  // Calcular el factor de escala usando la fórmula del legacy
  const factor = Math.min(
    width / (width * cosA + height * sinA),
    height / (width * sinA + height * cosA)
  )
  
  // Calcular dimensiones del rectángulo inscrito
  const inscribedWidth = Math.floor(width * factor)
  const inscribedHeight = Math.floor(height * factor)
  
  // Centrar el rectángulo
  const x = Math.floor((width - inscribedWidth) / 2)
  const y = Math.floor((height - inscribedHeight) / 2)
  
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.max(1, inscribedWidth),
    height: Math.max(1, inscribedHeight)
  }
}

/**
 * Calcula un rectángulo conservador cuando no hay información de rotación específica
 */
function calculateConservativeRectangle(width: number, height: number): BoundingBox {
  const aspectRatio = width / height
  
  // Factor de reducción basado en la relación de aspecto
  let factor = 0.85 // Factor base
  
  // Ajustar factor según la relación de aspecto
  if (aspectRatio > 1.5) {
    // Imagen muy ancha
    factor = 0.9
  } else if (aspectRatio < 0.7) {
    // Imagen muy alta
    factor = 0.8
  }
  
  // Calcular dimensiones del rectángulo inscrito
  const inscribedWidth = Math.floor(width * factor)
  const inscribedHeight = Math.floor(height * factor)
  
  // Centrar el rectángulo
  const x = Math.floor((width - inscribedWidth) / 2)
  const y = Math.floor((height - inscribedHeight) / 2)
  
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.max(1, inscribedWidth),
    height: Math.max(1, inscribedHeight)
  }
}

/**
 * Encuentra el rectángulo inscrito más grande dentro del contenido detectado
 * que evite las esquinas vacías típicas de rotación
 */
function findInscribedRectangle(
  bounds: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
  imageData: Uint8ClampedArray
): BoundingBox {
  
  // Comenzar con el bounding box detectado
  let { x, y, width, height } = bounds
  
  // Reducir gradualmente desde los bordes hasta encontrar contenido sólido
  const step = Math.max(1, Math.floor(Math.min(width, height) * 0.01))
  
  // Reducir desde arriba
  while (y < bounds.y + bounds.height * 0.3 && hasLowContentDensity(imageData, canvasWidth, x, y, width, step)) {
    y += step
    height = Math.max(height - step, bounds.height * 0.7)
  }
  
  // Reducir desde abajo
  while (height > bounds.height * 0.7 && hasLowContentDensity(imageData, canvasWidth, x, y + height - step, width, step)) {
    height -= step
  }
  
  // Reducir desde la izquierda
  while (x < bounds.x + bounds.width * 0.3 && hasLowContentDensity(imageData, canvasWidth, x, y, step, height)) {
    x += step
    width = Math.max(width - step, bounds.width * 0.7)
  }
  
  // Reducir desde la derecha
  while (width > bounds.width * 0.7 && hasLowContentDensity(imageData, canvasWidth, x + width - step, y, step, height)) {
    width -= step
  }
  
  // Asegurar que las dimensiones sean válidas
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.max(1, width),
    height: Math.max(1, height)
  }
}

/**
 * Determina si una región tiene baja densidad de contenido (probable borde de rotación)
 */
function hasLowContentDensity(
  imageData: Uint8ClampedArray,
  canvasWidth: number,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  
  let validPixels = 0
  let totalPixels = 0
  
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const pixelX = Math.floor(x + dx)
      const pixelY = Math.floor(y + dy)
      
      if (pixelX >= 0 && pixelX < canvasWidth && pixelY >= 0) {
        const pixelIndex = (pixelY * canvasWidth + pixelX) * 4
        if (pixelIndex < imageData.length) {
          const alpha = imageData[pixelIndex + 3]
          const r = imageData[pixelIndex]
          const g = imageData[pixelIndex + 1]
          const b = imageData[pixelIndex + 2]
          
          totalPixels++
          
          // Considerar válido si tiene alpha alto y no es color de fondo típico
          if (alpha > 120 && !(r > 220 && g > 210 && b > 180)) { // Más agresivo con beiges
            validPixels++
          }
        }
      }
    }
  }
  
  if (totalPixels === 0) return true
  
  const density = validPixels / totalPixels
  return density < 0.4  // Menos del 40% de píxeles válidos = baja densidad
}



/**
 * Crea un canvas desde un ImageBitmap
 */
function createCanvasFromImageBitmap(imageBitmap: ImageBitmap): OffscreenCanvas {
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No se pudo crear contexto para canvas')
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(imageBitmap, 0, 0)
  return canvas
}

/**
 * Crea visualización de debug de la máscara alpha
 * Resalta en rojo las áreas transparentes (para debugging)
 */
export function createAlphaDebugVisualization(
  canvas: OffscreenCanvas, 
  threshold: number = 0
): OffscreenCanvas {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const debugCanvas = new OffscreenCanvas(canvas.width, canvas.height)
  const debugCtx = debugCanvas.getContext('2d')
  if (!debugCtx) return canvas

  // Dibujar imagen original
  debugCtx.drawImage(canvas, 0, 0)

  // Obtener datos de imagen
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  // Crear overlay de debug
  const overlayData = debugCtx.createImageData(canvas.width, canvas.height)
  
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    
    if (alpha <= threshold) {
      // Áreas transparentes en rojo semi-transparente
      overlayData.data[i] = 255     // R
      overlayData.data[i + 1] = 0   // G
      overlayData.data[i + 2] = 0   // B
      overlayData.data[i + 3] = 100 // A (semi-transparente)
    } else {
      // Áreas válidas - transparente (no dibujar overlay)
      overlayData.data[i] = 0
      overlayData.data[i + 1] = 0
      overlayData.data[i + 2] = 0
      overlayData.data[i + 3] = 0
    }
  }
  
  // Aplicar overlay
  debugCtx.putImageData(overlayData, 0, 0)
  
  return debugCanvas
}
