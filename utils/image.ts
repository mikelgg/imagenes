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
  isRotated: boolean = false
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

    // Para imágenes rotadas, aplicar optimización de recorte rectangular MÁS AGRESIVA
    if (isRotated) {
      boundingBox = optimizeRotatedCrop(boundingBox, sourceCanvas.width, sourceCanvas.height, data)
      // Aplicar un segundo pase de recorte más agresivo
      boundingBox = applyAggressiveCrop(boundingBox, sourceCanvas.width, sourceCanvas.height, data)
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
      
      // CRITERIO 4: Detección más agresiva de fondos texturizados (como alfombras)
      const isTexturedBackground = detectTexturedBackground(r, g, b, alpha, x, y, width, height, data, edgeData)
      if (isTexturedBackground) continue
      
      // CRITERIO 5: Para píxeles con transparencia parcial, ser más estricto
      if (alpha < 200) {
        // Solo considerar válidos si tienen contraste significativo con el fondo típico
        const hasSignificantContent = (
          // No es color de fondo interpolado
          !(r > 220 && g > 210 && b > 180) && // Detectar beiges/cremas
          // Tiene suficiente saturación o contraste
          (Math.max(r, g, b) - Math.min(r, g, b) > 15 || Math.max(r, g, b) < 180)
        )
        if (!hasSignificantContent) continue
      }
      
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
 * Detecta fondos texturizados (como alfombras, telas, etc.) que aparecen en los bordes después de rotación
 */
function detectTexturedBackground(
  r: number, g: number, b: number, alpha: number,
  x: number, y: number, width: number, height: number,
  imageData: Uint8ClampedArray,
  edgeData: any
): boolean {
  
  // Solo analizar píxeles cerca de los bordes
  const distanceFromEdge = Math.min(x, y, width - 1 - x, height - 1 - y)
  const maxDistanceToAnalyze = Math.min(60, Math.floor(Math.min(width, height) * 0.15))
  
  if (distanceFromEdge > maxDistanceToAnalyze) return false
  
  // 1. Detectar colores típicos de fondos texturizados (beiges, cremas, marrones claros)
  const isBeigeCream = (
    // Tonos beige/crema
    (r > 210 && g > 200 && b > 170 && r - b > 20 && r - b < 60) ||
    // Tonos crema más claros
    (r > 230 && g > 220 && b > 200 && r - g < 15 && g - b > 10) ||
    // Marrones muy claros
    (r > 200 && g > 180 && b > 150 && r - g > 10 && g - b > 15)
  )
  
  if (!isBeigeCream) return false
  
  // 2. Analizar consistencia del color en un área pequeña (detección de textura uniforme)
  const sampleRadius = 3
  let similarPixels = 0
  let totalSamples = 0
  
  for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
      const sampleX = x + dx
      const sampleY = y + dy
      
      if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
        const sampleIndex = (sampleY * width + sampleX) * 4
        if (sampleIndex < imageData.length) {
          const sampleR = imageData[sampleIndex]
          const sampleG = imageData[sampleIndex + 1]
          const sampleB = imageData[sampleIndex + 2]
          
          // Verificar si el píxel muestreado tiene color similar
          const colorDistance = Math.sqrt(
            Math.pow(r - sampleR, 2) + 
            Math.pow(g - sampleG, 2) + 
            Math.pow(b - sampleB, 2)
          )
          
          if (colorDistance < 30) { // Colores similares
            similarPixels++
          }
          totalSamples++
        }
      }
    }
  }
  
  // Si hay alta consistencia de color = probablemente fondo texturizado
  const consistency = totalSamples > 0 ? similarPixels / totalSamples : 0
  
  // 3. Decisión final: es fondo texturizado si:
  return (
    consistency > 0.6 && // Al menos 60% de píxeles similares en el área
    distanceFromEdge < maxDistanceToAnalyze && // Está cerca del borde
    alpha > 200 // Tiene alpha alto (no es transparencia obvia)
  )
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
 * Optimiza el recorte para imágenes rotadas, maximizando el área de contenido
 * sin incluir esquinas vacías típicas de rotación
 */
function optimizeRotatedCrop(
  initialBounds: BoundingBox, 
  canvasWidth: number, 
  canvasHeight: number, 
  imageData: Uint8ClampedArray
): BoundingBox {
  
  // Calcular el centro de la imagen
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  
  // Calcular el centro del contenido detectado
  const contentCenterX = initialBounds.x + initialBounds.width / 2
  const contentCenterY = initialBounds.y + initialBounds.height / 2
  
  // Si el contenido está muy descentrado, podría ser indicativo de rotación
  const offsetX = Math.abs(contentCenterX - centerX)
  const offsetY = Math.abs(contentCenterY - centerY)
  const maxExpectedOffset = Math.min(canvasWidth, canvasHeight) * 0.1
  
  // Para rotaciones significativas, aplicar crop más conservador pero efectivo
  if (offsetX > maxExpectedOffset || offsetY > maxExpectedOffset) {
    // Buscar el rectángulo inscrito más grande que evite las esquinas problemáticas
    return findInscribedRectangle(initialBounds, canvasWidth, canvasHeight, imageData)
  }
  
  return initialBounds
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
 * Aplica un recorte más agresivo específicamente para imágenes rotadas
 * con fondos texturizados que necesitan ser eliminados completamente
 */
function applyAggressiveCrop(
  bounds: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
  imageData: Uint8ClampedArray
): BoundingBox {
  
  let { x, y, width, height } = bounds
  
  // Reducción agresiva desde cada borde
  const maxReduction = 0.15 // Máximo 15% de reducción por lado
  const stepSize = Math.max(2, Math.floor(Math.min(width, height) * 0.01))
  
  // Recortar desde arriba
  let topReduction = 0
  while (topReduction < height * maxReduction) {
    const sampleHeight = Math.min(stepSize * 3, height - topReduction)
    if (hasLowContentDensityAggressive(imageData, canvasWidth, x, y + topReduction, width, sampleHeight)) {
      topReduction += stepSize
    } else {
      break
    }
  }
  
  // Recortar desde abajo
  let bottomReduction = 0
  while (bottomReduction < height * maxReduction) {
    const sampleHeight = Math.min(stepSize * 3, height - bottomReduction)
    if (hasLowContentDensityAggressive(imageData, canvasWidth, x, y + height - bottomReduction - sampleHeight, width, sampleHeight)) {
      bottomReduction += stepSize
    } else {
      break
    }
  }
  
  // Recortar desde la izquierda
  let leftReduction = 0
  while (leftReduction < width * maxReduction) {
    const sampleWidth = Math.min(stepSize * 3, width - leftReduction)
    if (hasLowContentDensityAggressive(imageData, canvasWidth, x + leftReduction, y, sampleWidth, height)) {
      leftReduction += stepSize
    } else {
      break
    }
  }
  
  // Recortar desde la derecha
  let rightReduction = 0
  while (rightReduction < width * maxReduction) {
    const sampleWidth = Math.min(stepSize * 3, width - rightReduction)
    if (hasLowContentDensityAggressive(imageData, canvasWidth, x + width - rightReduction - sampleWidth, y, sampleWidth, height)) {
      rightReduction += stepSize
    } else {
      break
    }
  }
  
  // Aplicar reducciones
  return {
    x: Math.max(0, x + leftReduction),
    y: Math.max(0, y + topReduction),
    width: Math.max(50, width - leftReduction - rightReduction), // Mínimo 50px de ancho
    height: Math.max(50, height - topReduction - bottomReduction) // Mínimo 50px de alto
  }
}

/**
 * Versión más agresiva de detección de baja densidad
 * Específicamente diseñada para eliminar fondos texturizados
 */
function hasLowContentDensityAggressive(
  imageData: Uint8ClampedArray,
  canvasWidth: number,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  
  let validPixels = 0
  let totalPixels = 0
  let backgroundPixels = 0
  
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
          
          // Detectar píxeles de fondo texturizado (beiges, cremas, etc.)
          const isBackgroundColor = (
            // Beiges/cremas típicos de alfombras
            (r > 200 && g > 190 && b > 160 && r - b > 15) ||
            // Colores muy claros (blancos/grises)
            (r > 230 && g > 230 && b > 230) ||
            // Colores con baja saturación
            (Math.max(r, g, b) - Math.min(r, g, b) < 20 && r > 180)
          )
          
          if (isBackgroundColor) {
            backgroundPixels++
          } else if (alpha > 100) {
            validPixels++
          }
        }
      }
    }
  }
  
  if (totalPixels === 0) return true
  
  const backgroundRatio = backgroundPixels / totalPixels
  const validRatio = validPixels / totalPixels
  
  // Es baja densidad si hay muchos píxeles de fondo y pocos válidos
  return backgroundRatio > 0.5 || validRatio < 0.3
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
