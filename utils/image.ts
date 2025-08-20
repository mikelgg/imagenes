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
 * @returns Resultado del auto-recorte con canvas recortado
 */
export function autoCropByAlpha(
  input: OffscreenCanvas | ImageBitmap, 
  threshold: number = 0
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
    const boundingBox = calculateAlphaBoundingBox(data, sourceCanvas.width, sourceCanvas.height, threshold)
    
    if (!boundingBox) {
      // No se encontró contenido válido - devolver canvas original como fallback seguro
      return {
        success: false,
        boundingBox: { x: 0, y: 0, width: sourceCanvas.width, height: sourceCanvas.height },
        canvas: sourceCanvas,
        debugInfo: { reason: 'No content found', threshold }
      }
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
        threshold
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
 * Detecta tanto transparencia como bordes interpolados de rotación
 */
function calculateAlphaBoundingBox(
  data: Uint8ClampedArray, 
  width: number, 
  height: number, 
  threshold: number
): BoundingBox | null {
  let minX = width, minY = height, maxX = -1, maxY = -1

  // ALGORITMO MEJORADO: Detectar contenido real vs bordes de rotación
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1] 
      const b = data[pixelIndex + 2]
      const alpha = data[pixelIndex + 3]
      
      // CRITERIOS MÚLTIPLES para detectar contenido real:
      
      // 1. Píxeles completamente transparentes = fondo
      if (alpha <= threshold) continue
      
      // 2. Píxeles muy transparentes (interpolación) = probablemente fondo  
      if (alpha < 30) continue
      
      // 3. Detectar píxeles de "fondo claro" típicos de rotación
      // Estos son píxeles que aparecen por interpolación en los bordes
      const isLightBackground = (
        // Colores muy claros/blanquecinos
        (r > 240 && g > 240 && b > 240) ||
        // Colores beige/amarillentos típicos de fondos interpolados
        (r > 230 && g > 220 && b > 180 && Math.abs(r - g) < 20) ||
        // Grises muy claros
        (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 235)
      )
      
      // 4. Si el píxel tiene alpha medio y es color de fondo, probablemente es borde
      if (alpha < 200 && isLightBackground) continue
      
      // 5. PÍXEL VÁLIDO: Alpha significativo y no es color de fondo típico
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

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  }
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
