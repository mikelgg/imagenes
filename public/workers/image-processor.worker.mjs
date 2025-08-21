// Image Processor Web Worker (ES Module)
// Procesamiento de imágenes con auto-recorte inteligente

/**
 * Auto-recorte basado en píxeles con alpha > umbral
 * Encuentra el bounding box mínimo que contiene píxeles no-transparentes
 */
function autoCropByAlpha(input, threshold = 0) {
  try {
    // Crear canvas temporal si la entrada es ImageBitmap
    let sourceCanvas
    
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
    let fallbackCanvas
    if (input instanceof ImageBitmap) {
      fallbackCanvas = new OffscreenCanvas(input.width, input.height)
      const fallbackCtx = fallbackCanvas.getContext('2d')
      if (fallbackCtx) {
        fallbackCtx.clearRect(0, 0, input.width, input.height)
        fallbackCtx.drawImage(input, 0, 0)
      }
    } else {
      fallbackCanvas = input
    }
      
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
function calculateAlphaBoundingBox(data, width, height, threshold) {
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

  // REFINAMIENTO: Contraer bordes si detectamos líneas de píxeles sospechosos
  const result = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  }
  
  // Contraer bordes que parecen ser artefactos de rotación
  const refinedResult = refineBoundingBox(data, width, height, result)
  
  devLog('🔍 Auto-recorte detallado', {
    original: `${width}x${height}`,
    boundingBoxInicial: `(${result.x},${result.y}) ${result.width}x${result.height}`,
    boundingBoxRefinado: `(${refinedResult.x},${refinedResult.y}) ${refinedResult.width}x${refinedResult.height}`,
    reduccionInicial: `${Math.round((1 - (result.width * result.height) / (width * height)) * 100)}%`,
    reduccionFinal: `${Math.round((1 - (refinedResult.width * refinedResult.height) / (width * height)) * 100)}%`
  })
  
  return refinedResult
}

/**
 * Refina el bounding box contrayendo bordes sospechosos
 */
function refineBoundingBox(data, width, height, bbox) {
  let { x: minX, y: minY } = bbox
  let maxX = bbox.x + bbox.width - 1
  let maxY = bbox.y + bbox.height - 1
  
  // Contraer desde arriba
  for (let y = minY; y < minY + 5 && y <= maxY; y++) {
    let suspiciousPixels = 0
    let totalPixels = 0
    
    for (let x = minX; x <= maxX; x++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      const alpha = data[pixelIndex + 3]
      
      totalPixels++
      
      // Píxel sospechoso de ser borde de rotación
      if (alpha < 100 || (r > 230 && g > 220 && b > 180)) {
        suspiciousPixels++
      }
    }
    
    // Si >70% de los píxeles son sospechosos, contraer el borde
    if (suspiciousPixels / totalPixels > 0.7) {
      minY = y + 1
    } else {
      break
    }
  }
  
  // Contraer desde abajo
  for (let y = maxY; y > maxY - 5 && y >= minY; y--) {
    let suspiciousPixels = 0
    let totalPixels = 0
    
    for (let x = minX; x <= maxX; x++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      const alpha = data[pixelIndex + 3]
      
      totalPixels++
      
      if (alpha < 100 || (r > 230 && g > 220 && b > 180)) {
        suspiciousPixels++
      }
    }
    
    if (suspiciousPixels / totalPixels > 0.7) {
      maxY = y - 1
    } else {
      break
    }
  }
  
  // Contraer desde izquierda
  for (let x = minX; x < minX + 5 && x <= maxX; x++) {
    let suspiciousPixels = 0
    let totalPixels = 0
    
    for (let y = minY; y <= maxY; y++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      const alpha = data[pixelIndex + 3]
      
      totalPixels++
      
      if (alpha < 100 || (r > 230 && g > 220 && b > 180)) {
        suspiciousPixels++
      }
    }
    
    if (suspiciousPixels / totalPixels > 0.7) {
      minX = x + 1
    } else {
      break
    }
  }
  
  // Contraer desde derecha
  for (let x = maxX; x > maxX - 5 && x >= minX; x--) {
    let suspiciousPixels = 0
    let totalPixels = 0
    
    for (let y = minY; y <= maxY; y++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      const alpha = data[pixelIndex + 3]
      
      totalPixels++
      
      if (alpha < 100 || (r > 230 && g > 220 && b > 180)) {
        suspiciousPixels++
      }
    }
    
    if (suspiciousPixels / totalPixels > 0.7) {
      maxX = x - 1
    } else {
      break
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1)
  }
}

// Configuración de debug
const DEBUG_MODE = typeof self !== 'undefined' && self.location && self.location.hostname === 'localhost'

// Utilidades de logging y timing
function devLog(message, data = null) {
  if (DEBUG_MODE) {
    if (data) {
      console.log(`[Worker] ${message}`, data)
    } else {
      console.log(`[Worker] ${message}`)
    }
  }
}

const timer = {
  start: function(label) {
    this[label] = performance.now()
  },
  end: function(label) {
    const elapsed = performance.now() - this[label]
    devLog(`${label} completed in ${elapsed.toFixed(2)}ms`)
    return elapsed
  }
}

/**
 * Cargar imagen desde archivo
 */
function loadImage(file) {
  return new Promise(async (resolve, reject) => {
    try {
      const imageBitmap = await createImageBitmap(file)
      resolve(imageBitmap)
    } catch (error) {
      reject(new Error('Failed to load image: ' + error.message))
    }
  })
}

/**
 * Aplicar rotación a imagen
 */
function rotateImage(imageBitmap, angleDegrees) {
  timer.start('rotation')
  
  const { width: origWidth, height: origHeight } = imageBitmap
  
  // Normalizar ángulo
  let normalizedAngle = ((angleDegrees % 360) + 360) % 360
  if (normalizedAngle > 180) normalizedAngle -= 360
  
  // Saltar rotaciones mínimas
  if (Math.abs(normalizedAngle) < 0.5) {
    devLog('Rotación mínima omitida', { angle: normalizedAngle })
    return imageBitmap
  }
  
  const angleRad = (normalizedAngle * Math.PI) / 180
  const cos = Math.abs(Math.cos(angleRad))
  const sin = Math.abs(Math.sin(angleRad))
  
  // Calcular tamaño expandido para contener imagen rotada
  const expandedWidth = Math.ceil(origWidth * cos + origHeight * sin)
  const expandedHeight = Math.ceil(origWidth * sin + origHeight * cos)
  
  // Añadir margen para interpolación
  const margin = Math.max(20, Math.min(origWidth, origHeight) * 0.05)
  const canvasWidth = expandedWidth + margin * 2
  const canvasHeight = expandedHeight + margin * 2
  
  // Crear canvas de rotación con fondo TRANSPARENTE
  const rotationCanvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const rotationCtx = rotationCanvas.getContext('2d')
  if (!rotationCtx) throw new Error('No se pudo obtener contexto 2D para rotación')
  
  // CRUCIAL: Fondo transparente, no blanco
  rotationCtx.clearRect(0, 0, canvasWidth, canvasHeight)
  
  // Configuración de alta calidad
  rotationCtx.imageSmoothingEnabled = true
  rotationCtx.imageSmoothingQuality = 'high'
  
  // Realizar rotación centrada
  rotationCtx.save()
  rotationCtx.translate(canvasWidth / 2, canvasHeight / 2)
  rotationCtx.rotate(-angleRad) // Rotación horaria estándar
  rotationCtx.drawImage(imageBitmap, -origWidth / 2, -origHeight / 2)
  rotationCtx.restore()
  
  timer.end('rotation')
  
  devLog(`🔄 Rotación aplicada: ${normalizedAngle}°`, {
    original: `${origWidth}x${origHeight}`,
    expanded: `${canvasWidth}x${canvasHeight}`
  })
  
  return rotationCanvas
}

/**
 * Procesar imagen principal
 */
async function processImage(img, options) {
  try {
    timer.start('totalProcessing')
    
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('OffscreenCanvas no disponible en este entorno')
    }
    
    devLog('🚀 Iniciando pipeline de procesamiento', {
      dimensions: `${img.width}x${img.height}`,
      rotation: options.rotation,
      format: options.format,
      pipeline: 'rotar → autoCropByAlpha → recorte → resize → exportar'
    })
    
    let workingCanvas
    let debugInfo = {}

    // PASO 1: Rotación (si se especifica)
    if (options.rotation !== 0) {
      const rotatedResult = rotateImage(img, options.rotation)
      workingCanvas = rotatedResult instanceof ImageBitmap 
        ? createCanvasFromImageBitmap(rotatedResult)
        : rotatedResult
    } else {
      // Sin rotación: crear canvas desde ImageBitmap
      workingCanvas = createCanvasFromImageBitmap(img)
    }

    // PASO 2: Auto-recorte mejorado (SIEMPRE aplicar)
    timer.start('autoCropByAlpha')
    
    // Para rotaciones, usar threshold = 0 y ser más agresivo
    const isRotated = options.rotation !== 0
    const threshold = isRotated ? 0 : 0  // Siempre threshold 0 para mejor precisión
    
    const autoCropResult = autoCropByAlpha(workingCanvas, threshold, isRotated)
    
    if (autoCropResult.success) {
      const originalArea = workingCanvas.width * workingCanvas.height
      const croppedArea = autoCropResult.boundingBox.width * autoCropResult.boundingBox.height
      const reductionPercentage = ((originalArea - croppedArea) / originalArea) * 100
      
      workingCanvas = autoCropResult.canvas || workingCanvas
      devLog('✅ Auto-recorte exitoso', {
        ...autoCropResult.debugInfo,
        boundingBox: autoCropResult.boundingBox,
        reduction: `${reductionPercentage.toFixed(1)}%`,
        wasRotated: isRotated
      })
      
      // Si la reducción es significativa después de rotación, es buena señal
      if (isRotated && reductionPercentage > 5) {
        devLog('🎯 Esquinas de rotación eliminadas exitosamente', { 
          reduction: `${reductionPercentage.toFixed(1)}%` 
        })
      }
    } else {
      devLog('⚠️ Auto-recorte falló, usando imagen original', autoCropResult.debugInfo)
    }
    
    debugInfo.autoCrop = {
      ...autoCropResult.debugInfo,
      wasRotated: isRotated
    }
    timer.end('autoCropByAlpha')
    
    // Modo debug: crear visualización de máscara alpha
    if (DEBUG_MODE && options.debugMode) {
      debugInfo.alphaMask = createAlphaDebugVisualization(
        autoCropResult.canvas || workingCanvas, 
        0
      )
    }

    // PASO 3: Recorte manual del usuario (si se especifica)
    if (options.cropWidth > 0 && options.cropHeight > 0) {
      timer.start('userCrop')
      const cropCanvas = new OffscreenCanvas(options.cropWidth, options.cropHeight)
      const cropCtx = cropCanvas.getContext('2d')
      if (!cropCtx) throw new Error('No se pudo crear contexto para recorte')
      
      cropCtx.clearRect(0, 0, options.cropWidth, options.cropHeight)
      cropCtx.drawImage(
        workingCanvas,
        options.cropX, options.cropY, options.cropWidth, options.cropHeight,
        0, 0, options.cropWidth, options.cropHeight
      )
      
      workingCanvas = cropCanvas
      timer.end('userCrop')
      devLog('✂️ Recorte manual aplicado', {
        crop: `${options.cropWidth}x${options.cropHeight}`,
        position: `(${options.cropX},${options.cropY})`
      })
    }

    // PASO 4: Redimensionado (si se especifica)
    if (options.resizeWidth > 0 || options.resizeHeight > 0) {
      timer.start('resize')
      let newWidth = options.resizeWidth || workingCanvas.width
      let newHeight = options.resizeHeight || workingCanvas.height

      // Mantener proporción si se solicita
      if (options.maintainAspectRatio) {
        const aspectRatio = workingCanvas.width / workingCanvas.height
        
        if (options.resizeWidth && !options.resizeHeight) {
          newWidth = options.resizeWidth
          newHeight = Math.round(newWidth / aspectRatio)
        } else if (options.resizeHeight && !options.resizeWidth) {
          newHeight = options.resizeHeight
          newWidth = Math.round(newHeight * aspectRatio)
        } else if (options.resizeWidth && options.resizeHeight) {
          const scaleX = options.resizeWidth / workingCanvas.width
          const scaleY = options.resizeHeight / workingCanvas.height
          const scale = Math.min(scaleX, scaleY)
          
          newWidth = Math.round(workingCanvas.width * scale)
          newHeight = Math.round(workingCanvas.height * scale)
        }
      }

      const resizeCanvas = new OffscreenCanvas(newWidth, newHeight)
      const resizeCtx = resizeCanvas.getContext('2d')
      if (!resizeCtx) throw new Error('No se pudo crear contexto para redimensionado')
      
      resizeCtx.imageSmoothingEnabled = true
      resizeCtx.imageSmoothingQuality = 'high'
      resizeCtx.clearRect(0, 0, newWidth, newHeight)
      resizeCtx.drawImage(workingCanvas, 0, 0, newWidth, newHeight)
      workingCanvas = resizeCanvas
      timer.end('resize')
      
      devLog('📏 Redimensionado aplicado', {
        original: `${img.width}x${img.height}`,
        resized: `${newWidth}x${newHeight}`
      })
    }

    // PASO 5: Exportación final
    timer.start('export')
    const mimeType = `image/${options.format}`
    const quality = options.format === 'png' ? undefined : options.quality / 100
    
    devLog('📤 Exportación final', {
      format: options.format,
      quality: options.quality,
      finalDimensions: `${workingCanvas.width}x${workingCanvas.height}`
    })
    
    // CRUCIAL: Aplicar fondo SOLO para JPEG, DESPUÉS del auto-recorte
    let exportCanvas = workingCanvas
    if (options.format === 'jpeg') {
      exportCanvas = new OffscreenCanvas(workingCanvas.width, workingCanvas.height)
      const exportCtx = exportCanvas.getContext('2d')
      if (!exportCtx) throw new Error('No se pudo crear contexto para exportación')
      
      // Fondo blanco seguro - el auto-recorte ya eliminó bordes transparentes
      exportCtx.fillStyle = 'white'
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
      exportCtx.drawImage(workingCanvas, 0, 0)
      
      devLog('⚪ Fondo blanco aplicado para JPEG (después del auto-recorte)')
    }
    
    // Generar blob final
    const blob = await exportCanvas.convertToBlob({ type: mimeType, quality })
    timer.end('export')
    timer.end('totalProcessing')
    
    devLog('🎉 Procesamiento completado', {
      fileSize: `${Math.round(blob.size / 1024)}KB`,
      finalDimensions: `${exportCanvas.width}x${exportCanvas.height}`,
      totalTime: `${(timer.totalProcessing).toFixed(2)}ms`
    })
    
    // Retornar resultado con info de debug si está habilitado
    if (DEBUG_MODE) {
      return {
        blob,
        debugInfo: {
          ...debugInfo,
          finalSize: `${exportCanvas.width}x${exportCanvas.height}`,
          fileSize: `${Math.round(blob.size / 1024)}KB`,
          totalProcessingTime: `${timer.totalProcessing.toFixed(2)}ms`
        }
      }
    } else {
      return blob
    }
    
  } catch (error) {
    devLog('❌ Error en procesamiento', { error: error.message })
    throw error
  }
}

/**
 * Crear canvas desde ImageBitmap
 */
function createCanvasFromImageBitmap(imageBitmap) {
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear contexto para canvas')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(imageBitmap, 0, 0)
  return canvas
}

/**
 * Crear visualización de debug de la máscara alpha
 * Resalta en rojo las áreas transparentes (para debugging)
 */
function createAlphaDebugVisualization(canvas, threshold = 0) {
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
  
  devLog('🔍 Visualización de máscara alpha creada (rojo = áreas transparentes)')
  return debugCanvas
}

// Manejador de mensajes del worker
self.onmessage = async (e) => {
  try {
    const { file, options } = e.data

    // Cargar imagen
    const img = await loadImage(file)
    
    // Procesar imagen
    const result = await processImage(img, options)
    
    // Preparar respuesta
    let response
    if (result.debugInfo) {
      // Modo debug
      response = {
        success: true,
        result: {
          blob: result.blob,
          debugInfo: result.debugInfo
        }
      }
      devLog('📊 Información de debug incluida', result.debugInfo)
    } else {
      // Modo normal
      response = {
        success: true,
        result: { blob: result }
      }
    }
    
    self.postMessage(response)
    
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
    self.postMessage(errorResponse)
  }
}
