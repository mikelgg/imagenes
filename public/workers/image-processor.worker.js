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
  
  // Robust trim with alpha detection + geometric fallback
  timer.start('smartTrim')
  const trimResult = trimByAlphaContent(rotationCanvas, normalizedAngle, 6) // threshold=6 for anti-alias
  timer.end('smartTrim')
  
  // Return both canvas and debug info
  return trimResult
}

// Calculate maximum inscribed rectangle for geometric fallback
function calculateMaxInscribedRectangle(originalWidth, originalHeight, angleDegrees) {
  const angleRad = (Math.abs(angleDegrees) * Math.PI) / 180
  const sin = Math.abs(Math.sin(angleRad))
  const cos = Math.abs(Math.cos(angleRad))
  
  // For 90-degree multiples, return original dimensions
  if (angleDegrees % 90 === 0) {
    return { width: originalWidth, height: originalHeight }
  }
  
  // Calculate the maximum axis-aligned rectangle that fits inside rotated image
  // Using the formula for maximum inscribed rectangle in rotated rectangle
  const w = originalWidth
  const h = originalHeight
  
  const inscribedWidth = (w * cos - h * sin) / (cos * cos - sin * sin)
  const inscribedHeight = (h * cos - w * sin) / (cos * cos - sin * sin)
  
  // Ensure positive dimensions and don't exceed original
  const finalWidth = Math.max(1, Math.min(originalWidth, Math.abs(inscribedWidth)))
  const finalHeight = Math.max(1, Math.min(originalHeight, Math.abs(inscribedHeight)))
  
  return {
    width: Math.floor(finalWidth),
    height: Math.floor(finalHeight)
  }
}

// Robust trim with alpha detection primary + geometric fallback
function trimByAlphaContent(canvas, angle = 0, alphaThreshold = 6) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get 2D context for robust trim')
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  // Step 1: Analyze edges for alpha content
  const edgeAnalysis = analyzeEdgeAlpha(data, canvas.width, canvas.height, alphaThreshold)
  
  devLog('🔍 Edge alpha analysis', edgeAnalysis)
  
  // Step 2: Try alpha-based trim first
  const alphaTrimResult = tryAlphaTrim(data, canvas.width, canvas.height, alphaThreshold)
  
  let trimResult
  let trimMethod = 'alpha'
  
  if (alphaTrimResult.success) {
    // Alpha trim successful
    trimResult = alphaTrimResult
    devLog('✅ Alpha trim successful', { 
      bounds: alphaTrimResult.bounds,
      reductionPercent: Math.round((1 - (alphaTrimResult.bounds.width * alphaTrimResult.bounds.height) / (canvas.width * canvas.height)) * 100)
    })
  } else {
    // Fallback to geometric trim
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
    
    devLog('⚠️ Geometric fallback applied', { 
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

// Try alpha-based trim
function tryAlphaTrim(data, width, height, threshold) {
  let minX = width, minY = height, maxX = -1, maxY = -1
  
  // Scan all pixels for alpha content
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > threshold) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  if (maxX === -1 || maxY === -1) {
    return { success: false, reason: 'No alpha content found' }
  }
  
  const trimWidth = maxX - minX + 1
  const trimHeight = maxY - minY + 1
  
  // Verify this creates a meaningful reduction
  const reduction = 1 - (trimWidth * trimHeight) / (width * height)
  if (reduction < 0.01) { // Less than 1% reduction
    return { success: false, reason: 'Insufficient reduction' }
  }
  
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
      
      devLog('🚀 Starting iPhone-style processing pipeline', { 
        dimensions: `${img.width}x${img.height}`,
        rotation: options.rotation,
        format: options.format,
        debugMode: DEBUG_MODE
      })
      
      // STRICT PIPELINE: EXIF → rotate+trim → crop → resize → export
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
        // No rotation: use original image on transparent canvas
        timer.start('noRotationSetup')
        workingCanvas = new OffscreenCanvas(img.width, img.height)
        const ctx = workingCanvas.getContext('2d')
        if (!ctx) throw new Error('Failed to get 2D context')
        
        // CRITICAL: Keep transparent background
        ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height)
        ctx.drawImage(normalizedImg, 0, 0)
        timer.end('noRotationSetup')
        
        debugInfo = {
          angle: 0,
          trimMethod: 'none',
          trimRect: { x: 0, y: 0, w: img.width, h: img.height },
          edgesAlphaCounts: { top: 0, bottom: 0, left: 0, right: 0 },
          finalEdgesAlphaCounts: { top: 0, bottom: 0, left: 0, right: 0 }
        }
        
        devLog('No rotation applied, using original image on transparent canvas')
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

      // Step 5: Export (ONLY NOW apply background if needed)
      timer.start('export')
      const mimeType = `image/${options.format}`
      const quality = options.format === 'png' ? undefined : options.quality / 100
      
      devLog('Starting export (background applied only now)', { 
        format: options.format,
        quality: options.quality,
        finalDimensions: `${workingCanvas.width}x${workingCanvas.height}`
      })
      
      // CRITICAL: Apply background ONLY for export, AFTER all trimming is done
      let exportCanvas = workingCanvas
      if (options.format === 'jpeg') {
        exportCanvas = new OffscreenCanvas(workingCanvas.width, workingCanvas.height)
        const exportCtx = exportCanvas.getContext('2d')
        if (!exportCtx) throw new Error('Failed to get 2D context for export')
        
        // NOW we apply white background (trim already removed transparencies)
        exportCtx.fillStyle = 'white'
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
        exportCtx.drawImage(workingCanvas, 0, 0)
        
        devLog('✅ White background applied ONLY for JPEG export (after trim)')
      }
      
      // Final export
      const blob = await exportCanvas.convertToBlob({ type: mimeType, quality })
      timer.end('export')
      timer.end('totalProcessing')
      
      devLog('🎉 Processing completed successfully', { 
        size: `${Math.round(blob.size / 1024)}KB`,
        finalDimensions: `${exportCanvas.width}x${exportCanvas.height}`,
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
            totalProcessingTime: `${(performance.now() - timer.totalProcessing).toFixed(2)}ms`
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
