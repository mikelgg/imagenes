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

// Perform rotation with proper alpha-based trimming (iPhone style)
function rotateAndTrimImage(imageBitmap, angleDegrees) {
  timer.start('rotation')
  
  const { width: origWidth, height: origHeight } = imageBitmap
  
  // Calculate oversized canvas to prevent clipping during rotation
  const angleRad = (Math.abs(angleDegrees) * Math.PI) / 180
  const cos = Math.abs(Math.cos(angleRad))
  const sin = Math.abs(Math.sin(angleRad))
  const canvasWidth = Math.ceil(origWidth * cos + origHeight * sin) + 20 // Extra padding for safety
  const canvasHeight = Math.ceil(origWidth * sin + origHeight * cos) + 20
  
  // Create rotation canvas with transparent background
  const rotationCanvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const rotationCtx = rotationCanvas.getContext('2d')
  if (!rotationCtx) throw new Error('Failed to get 2D context for rotation')
  
  // CRITICAL: Do NOT fill background - keep transparent
  // rotationCtx.clearRect is sufficient for transparency
  rotationCtx.clearRect(0, 0, canvasWidth, canvasHeight)
  
  // Perform centered rotation
  rotationCtx.save()
  rotationCtx.translate(canvasWidth / 2, canvasHeight / 2)
  rotationCtx.rotate(-angleRad * (angleDegrees >= 0 ? 1 : -1)) // Respect sign
  rotationCtx.drawImage(imageBitmap, -origWidth / 2, -origHeight / 2)
  rotationCtx.restore()
  
  timer.end('rotation')
  
  devLog(`Rotation completed: ${angleDegrees}°`, { 
    original: `${origWidth}x${origHeight}`, 
    rotationCanvas: `${canvasWidth}x${canvasHeight}` 
  })
  
  // Now perform alpha-based trim
  timer.start('alphaTrim')
  const trimmedCanvas = trimByAlphaContent(rotationCanvas)
  timer.end('alphaTrim')
  
  return trimmedCanvas
}

// Alpha-based trim - find exact content boundaries
function trimByAlphaContent(canvas, alphaThreshold = 1) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get 2D context for alpha trim')
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  let minX = canvas.width
  let minY = canvas.height
  let maxX = -1
  let maxY = -1
  
  // Scan all pixels for any alpha > threshold
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const pixelIndex = (y * canvas.width + x) * 4
      const alpha = data[pixelIndex + 3]
      
      if (alpha > alphaThreshold) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  // If no content found, return original (should not happen)
  if (maxX === -1 || maxY === -1) {
    devLog('WARNING: No alpha content found, returning original canvas')
    return canvas
  }
  
  const trimWidth = maxX - minX + 1
  const trimHeight = maxY - minY + 1
  
  // Create trimmed canvas
  const trimmedCanvas = new OffscreenCanvas(trimWidth, trimHeight)
  const trimmedCtx = trimmedCanvas.getContext('2d')
  if (!trimmedCtx) throw new Error('Failed to get 2D context for trimmed canvas')
  
  // Copy only the content area (this maintains transparency)
  trimmedCtx.drawImage(canvas, minX, minY, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight)
  
  const trimRect = { x: minX, y: minY, width: trimWidth, height: trimHeight }
  
  devLog(`Alpha trim completed`, { 
    original: `${canvas.width}x${canvas.height}`,
    trimmed: `${trimWidth}x${trimHeight}`,
    trimRect
  })
  
  // Debug mode: draw red border on trimmed area
  if (DEBUG_MODE) {
    const debugCanvas = new OffscreenCanvas(trimWidth, trimHeight)
    const debugCtx = debugCanvas.getContext('2d')
    if (debugCtx) {
      debugCtx.drawImage(trimmedCanvas, 0, 0)
      debugCtx.strokeStyle = 'red'
      debugCtx.lineWidth = 2
      debugCtx.strokeRect(1, 1, trimWidth - 2, trimHeight - 2)
      devLog('Debug: Red border applied to trimmed area')
      return debugCanvas
    }
  }
  
  return trimmedCanvas
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
      if (options.rotation !== 0) {
        // This function does both rotation AND alpha-based trimming
        workingCanvas = rotateAndTrimImage(normalizedImg, options.rotation)
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
        finalDimensions: `${exportCanvas.width}x${exportCanvas.height}`
      })
      
      resolve(blob)
        
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
    
    // Process image
    const blob = await processImage(img, options)
    
    // Send result back
    const response = {
      success: true,
      result: { blob }
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
