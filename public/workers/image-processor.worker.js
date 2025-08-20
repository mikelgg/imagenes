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

// EXIF normalization - apply orientation correction
function normalizeImageOrientation(imageBitmap) {
  // For now, we assume the image is already oriented correctly
  // In a full implementation, we would read EXIF data and apply corrections
  devLog('EXIF normalization completed')
  return imageBitmap
}

// Calculate canvas size needed for rotation without clipping
function calculateRotationCanvasSize(width, height, angleDegrees) {
  const angleRad = (Math.abs(angleDegrees) * Math.PI) / 180
  const cos = Math.abs(Math.cos(angleRad))
  const sin = Math.abs(Math.sin(angleRad))
  
  const newWidth = Math.ceil(width * cos + height * sin)
  const newHeight = Math.ceil(width * sin + height * cos)
  
  return { width: newWidth, height: newHeight }
}

// Perform centered rotation on transparent background
function rotateImageCentered(imageBitmap, angleDegrees) {
  const { width: origWidth, height: origHeight } = imageBitmap
  const { width: canvasWidth, height: canvasHeight } = calculateRotationCanvasSize(origWidth, origHeight, angleDegrees)
  
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get 2D context for rotation')
  
  // Clear canvas with transparent background (no white fill!)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  
  // Rotate and draw centered
  const angleRad = (angleDegrees * Math.PI) / 180
  ctx.save()
  ctx.translate(canvasWidth / 2, canvasHeight / 2)
  ctx.rotate(-angleRad) // Negative for clockwise
  ctx.drawImage(imageBitmap, -origWidth / 2, -origHeight / 2)
  ctx.restore()
  
  devLog(`Centered rotation completed: ${angleDegrees}°`, { 
    original: `${origWidth}x${origHeight}`, 
    canvas: `${canvasWidth}x${canvasHeight}` 
  })
  
  return canvas
}

// Auto-trim by alpha detection - find minimal bounding box
function trimCanvasByAlpha(canvas, alphaThreshold = 5) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get 2D context for trimming')
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  let minX = canvas.width, minY = canvas.height
  let maxX = 0, maxY = 0
  
  // Scan for non-transparent pixels
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = data[(y * canvas.width + x) * 4 + 3]
      if (alpha > alphaThreshold) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  // If no content found, return original
  if (minX >= maxX || minY >= maxY) {
    devLog('No content found for trimming, returning original')
    return canvas
  }
  
  const trimWidth = maxX - minX + 1
  const trimHeight = maxY - minY + 1
  
  // Create trimmed canvas
  const trimmedCanvas = new OffscreenCanvas(trimWidth, trimHeight)
  const trimmedCtx = trimmedCanvas.getContext('2d')
  if (!trimmedCtx) throw new Error('Failed to get 2D context for trimmed canvas')
  
  // Copy trimmed area
  trimmedCtx.drawImage(canvas, minX, minY, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight)
  
  devLog(`Alpha trim completed`, { 
    original: `${canvas.width}x${canvas.height}`,
    trimmed: `${trimWidth}x${trimHeight}`,
    bounds: `(${minX},${minY}) to (${maxX},${maxY})`
  })
  
  return trimmedCanvas
}

function processImage(img, options) {
  return new Promise(async (resolve, reject) => {
    try {
      // Use OffscreenCanvas (should always be available in Web Workers)
      if (typeof OffscreenCanvas === 'undefined') {
        throw new Error('OffscreenCanvas is not available in this environment')
      }
      
      devLog('Starting image processing pipeline', { 
        dimensions: `${img.width}x${img.height}`,
        rotation: options.rotation,
        format: options.format
      })
      
      // PIPELINE: EXIF → rotate → trim → crop → resize → export
      let workingCanvas

      // Step 1: EXIF Normalization
      const normalizedImg = normalizeImageOrientation(img)
      
      // Step 2: Rotation (if needed)
      if (options.rotation !== 0) {
        workingCanvas = rotateImageCentered(normalizedImg, options.rotation)
        
        // Step 3: Auto-trim by alpha detection
        workingCanvas = trimCanvasByAlpha(workingCanvas)
      } else {
        // No rotation: create canvas with original image
        workingCanvas = new OffscreenCanvas(img.width, img.height)
        const ctx = workingCanvas.getContext('2d')
        if (!ctx) throw new Error('Failed to get 2D context')
        
        // Draw on transparent background (no white fill for consistency)
        ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height)
        ctx.drawImage(normalizedImg, 0, 0)
        devLog('No rotation applied, using original image')
      }

      // Step 4: Apply custom crop if specified (user crop after auto-trim)
      if (options.cropWidth > 0 && options.cropHeight > 0) {
        const cropCanvas = new OffscreenCanvas(options.cropWidth, options.cropHeight)
        const cropCtx = cropCanvas.getContext('2d')
        if (!cropCtx) throw new Error('Failed to get 2D context for crop')
        
        cropCtx.drawImage(
          workingCanvas,
          options.cropX, options.cropY, options.cropWidth, options.cropHeight,
          0, 0, options.cropWidth, options.cropHeight
        )
        
        workingCanvas = cropCanvas
        devLog('Custom crop applied', { 
          crop: `${options.cropWidth}x${options.cropHeight}`,
          position: `(${options.cropX},${options.cropY})`
        })
      }

      // Step 5: Apply resize if specified
      if (options.resizeWidth > 0 || options.resizeHeight > 0) {
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
            // Use the constraint that requires the smallest scale
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
        
        // Use high-quality scaling
        resizeCtx.imageSmoothingEnabled = true
        resizeCtx.imageSmoothingQuality = 'high'
        
        resizeCtx.drawImage(workingCanvas, 0, 0, newWidth, newHeight)
        workingCanvas = resizeCanvas
        
        devLog('Resize applied', { 
          original: `${workingCanvas.width}x${workingCanvas.height}`,
          resized: `${newWidth}x${newHeight}`
        })
      }

      // Step 6: Export to blob
      const mimeType = `image/${options.format}`
      const quality = options.format === 'png' ? undefined : options.quality / 100
      
      devLog('Starting export', { 
        format: options.format,
        quality: options.quality,
        finalDimensions: `${workingCanvas.width}x${workingCanvas.height}`
      })
      
      // For JPEG, we might want to composite on white background to avoid transparency issues
      let exportCanvas = workingCanvas
      if (options.format === 'jpeg') {
        exportCanvas = new OffscreenCanvas(workingCanvas.width, workingCanvas.height)
        const exportCtx = exportCanvas.getContext('2d')
        if (!exportCtx) throw new Error('Failed to get 2D context for export')
        
        // Fill with white background for JPEG
        exportCtx.fillStyle = 'white'
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
        exportCtx.drawImage(workingCanvas, 0, 0)
        
        devLog('Applied white background for JPEG export')
      }
      
      // OffscreenCanvas convertToBlob method
      const blob = await exportCanvas.convertToBlob({ type: mimeType, quality })
      devLog('Export completed', { size: `${Math.round(blob.size / 1024)}KB` })
      resolve(blob)
        
    } catch (error) {
      devLog('Processing failed', { error: error.message })
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
