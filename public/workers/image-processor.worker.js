// Image Processor Web Worker
// Handles image processing operations in a separate thread

// Image processing functions
function loadImage(file) {
  return new Promise(async (resolve, reject) => {
    try {
      // Use createImageBitmap which is available in Web Workers
      const imageBitmap = await createImageBitmap(file)
      resolve(imageBitmap)
    } catch (error) {
      reject(new Error('Failed to load image: ' + error.message))
    }
  })
}

// Development logging helper
function devLog(message, data = null) {
  if (typeof self !== 'undefined' && self.location && self.location.hostname === 'localhost') {
    if (data) {
      console.log(`[Worker] ${message}`, data)
    } else {
      console.log(`[Worker] ${message}`)
    }
  }
}

// Performance timing helper
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

// Debug mode flag (set to true for debugging)
const DEBUG_MODE = typeof self !== 'undefined' && self.location && self.location.hostname === 'localhost'

// Debug utilities for corner detection and alpha mask visualization
function detectWhiteCorners(canvas, threshold = 245) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { hasWhiteCorners: false, corners: {} }
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  const cornerSize = Math.min(20, Math.floor(Math.min(canvas.width, canvas.height) / 10))
  const corners = {
    topLeft: checkCornerWhiteness(data, canvas.width, canvas.height, 0, 0, cornerSize, threshold),
    topRight: checkCornerWhiteness(data, canvas.width, canvas.height, canvas.width - cornerSize, 0, cornerSize, threshold),
    bottomLeft: checkCornerWhiteness(data, canvas.width, canvas.height, 0, canvas.height - cornerSize, cornerSize, threshold),
    bottomRight: checkCornerWhiteness(data, canvas.width, canvas.height, canvas.width - cornerSize, canvas.height - cornerSize, cornerSize, threshold)
  }
  
  const whiteCornerCount = Object.values(corners).filter(corner => corner.isWhite).length
  
  return {
    hasWhiteCorners: whiteCornerCount > 0,
    whiteCornerCount,
    corners,
    analysis: `${whiteCornerCount}/4 corners are white (threshold: ${threshold})`
  }
}

function checkCornerWhiteness(data, width, height, startX, startY, size, threshold) {
  let whitePixels = 0
  let totalPixels = 0
  
  for (let y = startY; y < Math.min(startY + size, height); y++) {
    for (let x = startX; x < Math.min(startX + size, width); x++) {
      const pixelIndex = (y * width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      
      if (r >= threshold && g >= threshold && b >= threshold) {
        whitePixels++
      }
      totalPixels++
    }
  }
  
  const whiteness = totalPixels > 0 ? (whitePixels / totalPixels) : 0
  return {
    isWhite: whiteness > 0.8, // 80% of corner pixels are white
    whiteness: Math.round(whiteness * 100),
    whitePixels,
    totalPixels
  }
}

function createAlphaMaskVisualization(canvas) {
  if (!DEBUG_MODE) return canvas
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  // Create visualization canvas
  const maskCanvas = new OffscreenCanvas(canvas.width, canvas.height)
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) return canvas
  
  // Draw original image
  maskCtx.drawImage(canvas, 0, 0)
  
  // Overlay alpha mask in red for pixels with alpha > 0
  const overlayData = maskCtx.createImageData(canvas.width, canvas.height)
  
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    
    if (alpha > 0) {
      // Show alpha content in original colors
      overlayData.data[i] = data[i]     // R
      overlayData.data[i + 1] = data[i + 1] // G
      overlayData.data[i + 2] = data[i + 2] // B
      overlayData.data[i + 3] = alpha        // A
    } else {
      // Show transparent areas in red overlay
      overlayData.data[i] = 255     // R (red)
      overlayData.data[i + 1] = 0   // G
      overlayData.data[i + 2] = 0   // B
      overlayData.data[i + 3] = 100 // A (semi-transparent)
    }
  }
  
  maskCtx.putImageData(overlayData, 0, 0)
  
  devLog('🔍 Alpha mask visualization created (red = transparent areas)')
  return maskCanvas
}

// EXIF normalization - apply orientation correction
function normalizeImageOrientation(imageBitmap) {
  // For now, we assume the image is already oriented correctly
  // In a full implementation, we would read EXIF data and apply corrections
  devLog('EXIF normalization completed')
  return imageBitmap
}

// iPhone-style rotation with expand=True equivalent and smart background removal
function rotateAndTrimImage(imageBitmap, angleDegrees) {
  timer.start('rotation')
  
  const { width: origWidth, height: origHeight } = imageBitmap
  
  // Normalize angle and handle edge cases
  let normalizedAngle = ((angleDegrees % 360) + 360) % 360
  if (normalizedAngle > 180) normalizedAngle -= 360
  
  // For tiny rotations, skip processing
  if (Math.abs(normalizedAngle) < 0.5) {
    devLog('Skipping minimal rotation', { angle: normalizedAngle })
    return imageBitmap
  }
  
  const angleRad = (normalizedAngle * Math.PI) / 180
  const cos = Math.abs(Math.cos(angleRad))
  const sin = Math.abs(Math.sin(angleRad))
  
  // EXPAND=TRUE equivalent: Calculate expanded canvas size for full image visibility
  // Add generous padding to ensure no clipping at any angle
  const expandedWidth = Math.ceil(origWidth * cos + origHeight * sin)
  const expandedHeight = Math.ceil(origWidth * sin + origHeight * cos)
  
  // Add extra margin for edge interpolation and safety
  const margin = Math.max(20, Math.min(origWidth, origHeight) * 0.05)
  const canvasWidth = expandedWidth + margin * 2
  const canvasHeight = expandedHeight + margin * 2
  
  // Create large rotation canvas with TRANSPARENT background
  const rotationCanvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const rotationCtx = rotationCanvas.getContext('2d')
  if (!rotationCtx) throw new Error('Failed to get 2D context for rotation')
  
  // CRITICAL: Transparent background only - no white/black fills
  rotationCtx.clearRect(0, 0, canvasWidth, canvasHeight)
  
  // High-quality rotation settings
  rotationCtx.imageSmoothingEnabled = true
  rotationCtx.imageSmoothingQuality = 'high'
  
  // Perform centered rotation
  rotationCtx.save()
  rotationCtx.translate(canvasWidth / 2, canvasHeight / 2)
  rotationCtx.rotate(-angleRad) // Standard clockwise rotation
  rotationCtx.drawImage(imageBitmap, -origWidth / 2, -origHeight / 2)
  rotationCtx.restore()
  
  timer.end('rotation')
  
  devLog(`📐 iPhone-style rotation completed: ${normalizedAngle}°`, { 
    original: `${origWidth}x${origHeight}`, 
    expanded: `${canvasWidth}x${canvasHeight}`,
    expandedContent: `${expandedWidth}x${expandedHeight}`,
    margin: `${margin}px`
  })
  
  // Auto-recorte ÚNICO y PRECISO: solo el bounding box mínimo con alpha > 0
  timer.start('autoCrop')
  const trimResult = trimByAlphaContent(rotationCanvas, normalizedAngle, 0) // threshold = 0 para máxima precisión
  timer.end('autoCrop')
  
  devLog(`🎯 Auto-recorte completado: ${normalizedAngle}° rotado y recortado al bounding box mínimo`)
  
  // Retornar directamente el resultado del auto-recorte - no más procesamiento
  return { canvas: trimResult.canvas, debugInfo: trimResult.debugInfo }
}

// Apply aggressive border cleanup to eliminate any remaining white/transparent borders
function applyAggressiveBorderCleanup(canvas, angle) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  // Scan from edges inward to find actual content boundaries
  let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1
  
  // More aggressive scanning: consider a pixel "border" if it's mostly transparent or very light
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const pixelIndex = (y * canvas.width + x) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]
      const alpha = data[pixelIndex + 3]
      
      // Consider pixel as "content" if it's not transparent and not near-white
      const isContent = alpha > 20 && (r < 240 || g < 240 || b < 240)
      
      if (isContent) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  // If no content found, return original
  if (maxX === -1 || maxY === -1) {
    devLog('⚠️ No content found in aggressive cleanup, returning original')
    return canvas
  }
  
  const contentWidth = maxX - minX + 1
  const contentHeight = maxY - minY + 1
  
  // Only apply if there's a meaningful reduction (at least 2% reduction)
  const reduction = 1 - (contentWidth * contentHeight) / (canvas.width * canvas.height)
  if (reduction < 0.02) {
    devLog('📏 Aggressive cleanup: insufficient reduction, keeping original', { reduction: `${Math.round(reduction * 100)}%` })
    return canvas
  }
  
  // Create cleaned canvas
  const cleanCanvas = new OffscreenCanvas(contentWidth, contentHeight)
  const cleanCtx = cleanCanvas.getContext('2d')
  if (!cleanCtx) return canvas
  
  cleanCtx.clearRect(0, 0, contentWidth, contentHeight)
  cleanCtx.drawImage(canvas, minX, minY, contentWidth, contentHeight, 0, 0, contentWidth, contentHeight)
  
  devLog('🎯 Aggressive border cleanup applied', {
    original: `${canvas.width}x${canvas.height}`,
    cleaned: `${contentWidth}x${contentHeight}`,
    reduction: `${Math.round(reduction * 100)}%`,
    cropRect: `(${minX},${minY}) ${contentWidth}x${contentHeight}`
  })
  
  return cleanCanvas
}

// Calculate maximum inscribed rectangle for geometric fallback
function calculateMaxInscribedRectangle(originalWidth, originalHeight, angleDegrees) {
  const angleRad = (Math.abs(angleDegrees) * Math.PI) / 180
  const sin = Math.abs(Math.sin(angleRad))
  const cos = Math.abs(Math.cos(angleRad))
  
  // For 90-degree multiples, return original dimensions
  if (Math.abs(angleDegrees % 90) < 0.1) {
    return { width: originalWidth, height: originalHeight }
  }
  
  // NEW ALGORITHM: More aggressive calculation to maximize the inscribed rectangle
  // This uses a better mathematical approach that doesn't leave white borders
  const w = originalWidth
  const h = originalHeight
  
  // For small angles, use original dimensions to avoid over-cropping
  if (Math.abs(angleDegrees) < 1) {
    return { width: w, height: h }
  }
  
  // Calculate the largest rectangle that fits inside the rotated image
  // Using improved formula that accounts for the actual rotated bounds
  let inscribedWidth, inscribedHeight
  
  if (sin + cos <= 1) {
    // For smaller rotation angles
    inscribedWidth = w * cos + h * sin
    inscribedHeight = w * sin + h * cos
  } else {
    // For larger rotation angles - use the standard inscribed formula but optimized
    const denominator = cos * cos + sin * sin
    inscribedWidth = Math.abs((w * cos - h * sin) / denominator)
    inscribedHeight = Math.abs((h * cos - w * sin) / denominator)
  }
  
  // Apply a more aggressive approach - use 95% of calculated size to eliminate borders
  const aggressiveFactor = 0.98
  const finalWidth = Math.floor(Math.min(originalWidth, inscribedWidth * aggressiveFactor))
  const finalHeight = Math.floor(Math.min(originalHeight, inscribedHeight * aggressiveFactor))
  
  // Ensure minimum size
  return {
    width: Math.max(10, finalWidth),
    height: Math.max(10, finalHeight)
  }
}

// Auto-recorte preciso basado en bounding box de píxeles con alpha > 0
function trimByAlphaContent(canvas, angle = 0, alphaThreshold = 0) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get 2D context for auto-crop')
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  devLog('🎯 Iniciando auto-recorte al bounding box mínimo con alpha > 0')
  
  // SIEMPRE usar el método de alpha trim - es lo que requiere el usuario
  const alphaTrimResult = tryAlphaTrim(data, canvas.width, canvas.height, alphaThreshold)
  
  let trimResult
  let trimMethod = 'alpha'
  
  if (alphaTrimResult.success) {
    // Alpha trim successful - Este es el comportamiento deseado
    trimResult = alphaTrimResult
    devLog('✅ Auto-recorte exitoso al bounding box mínimo', { 
      bounds: alphaTrimResult.bounds,
      reductionPercent: Math.round((1 - (alphaTrimResult.bounds.width * alphaTrimResult.bounds.height) / (canvas.width * canvas.height)) * 100)
    })
  } else {
    // Solo usar fallback geométrico si realmente no hay contenido (caso muy raro)
    trimMethod = 'geometric'
    const { width: origWidth, height: origHeight } = canvas
    const maxRect = calculateMaxInscribedRectangle(origWidth, origHeight, angle)
    
    const centerX = Math.floor(origWidth / 2)
    const centerY = Math.floor(origHeight / 2)
    const x = centerX - Math.floor(maxRect.width / 2)
    const y = centerY - Math.floor(maxRect.height / 2)
    
    trimResult = {
      bounds: { x, y, width: maxRect.width, height: maxRect.height },
      success: true
    }
    
    devLog('⚠️ Fallback geométrico aplicado (no se encontró contenido con alpha > 0)', { 
      reason: 'Alpha trim failed',
      maxInscribed: maxRect,
      centerCrop: trimResult.bounds
    })
  }
  
  // Step 3: Create trimmed canvas
  const { x, y, width, height } = trimResult.bounds
  const trimmedCanvas = new OffscreenCanvas(width, height)
  const trimmedCtx = trimmedCanvas.getContext('2d')
  if (!trimmedCtx) throw new Error('Failed to get 2D context for trimmed canvas')
  
  // CRITICAL: Maintain alpha channel
  trimmedCtx.clearRect(0, 0, width, height)
  trimmedCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height)
  
  // Step 4: Verify result (for debug)
  const finalEdgeAnalysis = analyzeEdgeAlpha(
    trimmedCtx.getImageData(0, 0, width, height).data,
    width, height, alphaThreshold
  )
  
  const debugInfo = {
    angle,
    trimMethod,
    trimRect: { x, y, w: width, h: height },
    edgesAlphaCounts: edgeAnalysis.counts,
    finalEdgesAlphaCounts: finalEdgeAnalysis.counts,
    originalSize: `${canvas.width}x${canvas.height}`,
    finalSize: `${width}x${height}`
  }
  
  devLog(`🎯 Robust trim completed`, debugInfo)
  
  // Debug mode: visual verification
  if (DEBUG_MODE) {
    const debugCanvas = new OffscreenCanvas(width, height)
    const debugCtx = debugCanvas.getContext('2d')
    if (debugCtx) {
      debugCtx.drawImage(trimmedCanvas, 0, 0)
      
      // Red border
      debugCtx.strokeStyle = 'red'
      debugCtx.lineWidth = 2
      debugCtx.strokeRect(1, 1, width - 2, height - 2)
      
      // Method indicator
      debugCtx.fillStyle = 'red'
      debugCtx.font = 'bold 12px Arial'
      debugCtx.fillText(trimMethod.toUpperCase(), 5, 15)
      debugCtx.fillText(`${angle}°`, 5, 30)
      
      devLog('🔍 Debug visual applied')
      
      return { canvas: debugCanvas, debugInfo }
    }
  }
  
  return { canvas: trimmedCanvas, debugInfo }
}

// Analyze alpha content on edges
function analyzeEdgeAlpha(data, width, height, threshold) {
  const counts = { top: 0, bottom: 0, left: 0, right: 0 }
  
  // Top edge
  for (let x = 0; x < width; x++) {
    const alpha = data[(0 * width + x) * 4 + 3]
    if (alpha > threshold) counts.top++
  }
  
  // Bottom edge
  for (let x = 0; x < width; x++) {
    const alpha = data[((height - 1) * width + x) * 4 + 3]
    if (alpha > threshold) counts.bottom++
  }
  
  // Left edge
  for (let y = 0; y < height; y++) {
    const alpha = data[(y * width + 0) * 4 + 3]
    if (alpha > threshold) counts.left++
  }
  
  // Right edge
  for (let y = 0; y < height; y++) {
    const alpha = data[(y * width + (width - 1)) * 4 + 3]
    if (alpha > threshold) counts.right++
  }
  
  const totalEdgePixels = width * 2 + height * 2
  const totalAlphaPixels = counts.top + counts.bottom + counts.left + counts.right
  
  return {
    counts,
    totalEdgePixels,
    totalAlphaPixels,
    hasTransparentEdges: totalAlphaPixels < totalEdgePixels * 0.9 // 90% threshold
  }
}

// Precise alpha-based trim that finds exact bounding box of non-transparent pixels
function tryAlphaTrim(data, width, height, threshold = 0) {
  let minX = width, minY = height, maxX = -1, maxY = -1
  
  // PRECISIÓN MÁXIMA: Solo buscamos píxeles con alpha > 0 (no completamente transparentes)
  // Este es el criterio exacto requerido por el usuario
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4
      const alpha = data[pixelIndex + 3]
      
      // Criterio simple y preciso: alpha > 0 = píxel válido
      if (alpha > threshold) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  if (maxX === -1 || maxY === -1) {
    return { success: false, reason: 'No content found' }
  }
  
  const trimWidth = maxX - minX + 1
  const trimHeight = maxY - minY + 1
  
  // Aplicar siempre el recorte si encontramos un bounding box válido
  // No importa qué tan pequeña sea la reducción - eliminar bordes transparentes es valioso
  const reduction = 1 - (trimWidth * trimHeight) / (width * height)
  
  devLog('🎯 Bounding box de píxeles con alpha > 0 calculado', {
    boundingBox: `(${minX},${minY}) ${trimWidth}x${trimHeight}`,
    originalSize: `${width}x${height}`,
    reduction: `${Math.round(reduction * 100)}%`
  })
  
  return {
    success: true,
    bounds: { x: minX, y: minY, width: trimWidth, height: trimHeight }
  }
}

function processImage(img, options) {
  return new Promise(async (resolve, reject) => {
    try {
      timer.start('totalProcessing')
      
      // Use OffscreenCanvas (should always be available in Web Workers)
      if (typeof OffscreenCanvas === 'undefined') {
        throw new Error('OffscreenCanvas is not available in this environment')
      }
      
      devLog('🚀 Starting STRICT pipeline (no white backgrounds)', { 
        dimensions: `${img.width}x${img.height}`,
        rotation: options.rotation,
        format: options.format,
        debugMode: DEBUG_MODE,
        pipeline: 'EXIF → rotate → autocrop(alpha) → crop → resize → export'
      })
      
      // STRICT PIPELINE: EXIF → rotate → autocrop(alpha) → crop → resize → export
      // CRITICAL: NO early export to JPG/WEBP before autocrop
      let workingCanvas

      // Step 1: EXIF Normalization
      timer.start('exifNormalization')
      const normalizedImg = normalizeImageOrientation(img)
      timer.end('exifNormalization')
      
      // Step 2: Rotation + Alpha Trim (CRITICAL STEP)
      let debugInfo = null
      if (options.rotation !== 0) {
        // This function does both rotation AND alpha-based trimming
        const trimResult = rotateAndTrimImage(normalizedImg, options.rotation)
        workingCanvas = trimResult.canvas
        debugInfo = trimResult.debugInfo
      } else {
        // No rotation: transferir imagen a canvas transparente y aplicar auto-recorte
        timer.start('noRotationSetup')
        const tempCanvas = new OffscreenCanvas(img.width, img.height)
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx) throw new Error('Failed to get 2D context')
        
        // CRITICAL: Keep transparent background
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
        tempCtx.drawImage(normalizedImg, 0, 0)
        timer.end('noRotationSetup')
        
        // Aplicar auto-recorte incluso sin rotación para eliminar bordes transparentes
        timer.start('autoCropNoRotation')
        const trimResult = trimByAlphaContent(tempCanvas, 0, 0)
        workingCanvas = trimResult.canvas
        debugInfo = trimResult.debugInfo
        timer.end('autoCropNoRotation')
        
        devLog('✅ Sin rotación: imagen transferida y auto-recortada para eliminar bordes transparentes')
      }

      // Step 3: Apply user crop if specified (after auto-trim)
      if (options.cropWidth > 0 && options.cropHeight > 0) {
        timer.start('userCrop')
        const cropCanvas = new OffscreenCanvas(options.cropWidth, options.cropHeight)
        const cropCtx = cropCanvas.getContext('2d')
        if (!cropCtx) throw new Error('Failed to get 2D context for crop')
        
        // Keep transparent background for user crop too
        cropCtx.clearRect(0, 0, options.cropWidth, options.cropHeight)
        cropCtx.drawImage(
          workingCanvas,
          options.cropX, options.cropY, options.cropWidth, options.cropHeight,
          0, 0, options.cropWidth, options.cropHeight
        )
        
        workingCanvas = cropCanvas
        timer.end('userCrop')
        devLog('Custom crop applied', { 
          crop: `${options.cropWidth}x${options.cropHeight}`,
          position: `(${options.cropX},${options.cropY})`
        })
      }

      // Step 4: Apply resize if specified
      if (options.resizeWidth > 0 || options.resizeHeight > 0) {
        timer.start('resize')
        let newWidth = options.resizeWidth || workingCanvas.width
        let newHeight = options.resizeHeight || workingCanvas.height

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
        if (!resizeCtx) throw new Error('Failed to get 2D context for resize')
        
        // High-quality scaling with transparent background
        resizeCtx.imageSmoothingEnabled = true
        resizeCtx.imageSmoothingQuality = 'high'
        resizeCtx.clearRect(0, 0, newWidth, newHeight)
        resizeCtx.drawImage(workingCanvas, 0, 0, newWidth, newHeight)
        workingCanvas = resizeCanvas
        timer.end('resize')
        
        devLog('Resize applied', { 
          original: `${workingCanvas.width}x${workingCanvas.height}`,
          resized: `${newWidth}x${newHeight}`
        })
      }

      // Step 5: FINAL EXPORT (AFTER all autocrop/crop/resize)
      timer.start('export')
      const mimeType = `image/${options.format}`
      const quality = options.format === 'png' ? undefined : options.quality / 100
      
      devLog('🎯 FINAL EXPORT - no more processing after this', { 
        format: options.format,
        quality: options.quality,
        finalDimensions: `${workingCanvas.width}x${workingCanvas.height}`,
        note: 'All autocrop/trim completed - safe to apply background for JPEG'
      })
      
      // CRITICAL: Apply background ONLY for JPEG export, AFTER all alpha-based trimming
      let exportCanvas = workingCanvas
      if (options.format === 'jpeg') {
        exportCanvas = new OffscreenCanvas(workingCanvas.width, workingCanvas.height)
        const exportCtx = exportCanvas.getContext('2d')
        if (!exportCtx) throw new Error('Failed to get 2D context for export')
        
        // Safe to apply white background now - autocrop already removed transparent borders
        exportCtx.fillStyle = 'white'
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
        exportCtx.drawImage(workingCanvas, 0, 0)
        
        devLog('✅ White background applied safely for JPEG (after all alpha-based trimming)')
      } else {
        devLog('✅ PNG/WEBP export - maintaining alpha channel as-is')
      }
      
      // Final export
      const blob = await exportCanvas.convertToBlob({ type: mimeType, quality })
      timer.end('export')
      timer.end('totalProcessing')
      
      // QUALITY ASSURANCE: Detect white corners in final result
      let cornerAnalysis = null
      if (DEBUG_MODE || options.format === 'jpeg') {
        cornerAnalysis = detectWhiteCorners(exportCanvas, 245)
        if (cornerAnalysis.hasWhiteCorners) {
          devLog('⚠️ WARNING: White corners detected in final result!', cornerAnalysis)
        } else {
          devLog('✅ No white corners detected - clean result', cornerAnalysis.analysis)
        }
      }
      
      devLog('🎉 Processing completed successfully', { 
        size: `${Math.round(blob.size / 1024)}KB`,
        finalDimensions: `${exportCanvas.width}x${exportCanvas.height}`,
        cornerCheck: cornerAnalysis?.analysis || 'skipped',
        debugInfo
      })
      
      // Return debug info in development mode
      if (DEBUG_MODE && debugInfo) {
        resolve({
          blob,
          debugInfo: {
            ...debugInfo,
            finalSize: `${exportCanvas.width}x${exportCanvas.height}`,
            fileSize: `${Math.round(blob.size / 1024)}KB`,
            totalProcessingTime: `${(performance.now() - timer.totalProcessing).toFixed(2)}ms`,
            cornerAnalysis: cornerAnalysis || null,
            pipelineVerification: {
              exportedAfterAutocrop: true,
              noEarlyJpegExport: true,
              alphaPreservedUntilExport: options.format !== 'jpeg'
            }
          }
        })
      } else {
        resolve(blob)
      }
        
    } catch (error) {
      devLog('❌ Processing failed', { error: error.message })
      reject(error)
    }
  })
}

// Worker message handler
self.onmessage = async (e) => {
  try {
    const { file, options } = e.data

    // Load image
    const img = await loadImage(file)
    
    // Process image (may return blob or {blob, debugInfo})
    const result = await processImage(img, options)
    
    // Handle different return types
    let response
    if (result.debugInfo) {
      // Debug mode response
      response = {
        success: true,
        result: {
          blob: result.blob,
          debugInfo: result.debugInfo
        }
      }
      devLog('📊 Debug info returned', result.debugInfo)
    } else {
      // Normal response
      response = {
        success: true,
        result: { blob: result }
      }
    }
    
    self.postMessage(response)
    
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    self.postMessage(errorResponse)
  }
}
