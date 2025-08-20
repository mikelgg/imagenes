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

function calculateInscribedRectangle(width, height, angleDegrees) {
  // For 90-degree increments, handle specially
  if (angleDegrees % 90 === 0) {
    return { width, height, x: 0, y: 0 }
  }

  // Convert to radians
  const angleRad = (Math.abs(angleDegrees) * Math.PI) / 180
  const cos = Math.abs(Math.cos(angleRad))
  const sin = Math.abs(Math.sin(angleRad))

  // Calculate the largest inscribed rectangle
  const inscribedWidth = Math.floor((width * cos + height * sin) / (cos + sin))
  const inscribedHeight = Math.floor((height * cos + width * sin) / (cos + sin))

  // Center the rectangle
  const x = Math.floor((width - inscribedWidth) / 2)
  const y = Math.floor((height - inscribedHeight) / 2)

  return {
    width: inscribedWidth,
    height: inscribedHeight,
    x: Math.max(0, x),
    y: Math.max(0, y)
  }
}

function processImage(img, options) {
  return new Promise((resolve, reject) => {
    try {
      // Use OffscreenCanvas (should always be available in Web Workers)
      if (typeof OffscreenCanvas === 'undefined') {
        throw new Error('OffscreenCanvas is not available in this environment')
      }
      const canvas = new OffscreenCanvas(img.width, img.height)
      
      if (canvas.width !== undefined) {
        canvas.width = img.width
        canvas.height = img.height
      }
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get 2D context from canvas')
      }

      // Set initial canvas size
      canvas.width = img.width
      canvas.height = img.height

      // Clear canvas
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Apply rotation if needed
      if (options.rotation !== 0) {
        // Calculate new canvas size for rotation
        const angleRad = (options.rotation * Math.PI) / 180
        const cos = Math.abs(Math.cos(angleRad))
        const sin = Math.abs(Math.sin(angleRad))
        
        const newWidth = Math.ceil(img.width * cos + img.height * sin)
        const newHeight = Math.ceil(img.width * sin + img.height * cos)
        
        canvas.width = newWidth
        canvas.height = newHeight
        
        // Clear with white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Rotate and draw
        ctx.save()
        ctx.translate(newWidth / 2, newHeight / 2)
        ctx.rotate(-angleRad) // Negative for clockwise rotation
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        ctx.restore()

        // Auto-crop to remove rotation borders (like iPhone)
        const inscribed = calculateInscribedRectangle(img.width, img.height, options.rotation)
        const cropX = (newWidth - inscribed.width) / 2
        const cropY = (newHeight - inscribed.height) / 2
        
        // Create new canvas with cropped size
        const croppedCanvas = new OffscreenCanvas(inscribed.width, inscribed.height)
        croppedCanvas.width = inscribed.width
        croppedCanvas.height = inscribed.height
        const croppedCtx = croppedCanvas.getContext('2d')
        if (!croppedCtx) {
          throw new Error('Failed to get 2D context from cropped canvas')
        }
        
        croppedCtx.drawImage(
          canvas,
          cropX, cropY, inscribed.width, inscribed.height,
          0, 0, inscribed.width, inscribed.height
        )
        
        // Update working canvas
        canvas.width = inscribed.width
        canvas.height = inscribed.height
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(croppedCanvas, 0, 0)
      } else {
        // No rotation, just draw the image
        ctx.drawImage(img, 0, 0)
      }

      // Apply custom crop if specified
      if (options.cropWidth > 0 && options.cropHeight > 0) {
        const cropCanvas = new OffscreenCanvas(options.cropWidth, options.cropHeight)
        cropCanvas.width = options.cropWidth
        cropCanvas.height = options.cropHeight
        const cropCtx = cropCanvas.getContext('2d')
        if (!cropCtx) {
          throw new Error('Failed to get 2D context from crop canvas')
        }
        
        cropCtx.drawImage(
          canvas,
          options.cropX, options.cropY, options.cropWidth, options.cropHeight,
          0, 0, options.cropWidth, options.cropHeight
        )
        
        canvas.width = options.cropWidth
        canvas.height = options.cropHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(cropCanvas, 0, 0)
      }

      // Apply resize if specified
      if (options.resizeWidth > 0 || options.resizeHeight > 0) {
        let newWidth = options.resizeWidth || canvas.width
        let newHeight = options.resizeHeight || canvas.height

        if (options.maintainAspectRatio) {
          const aspectRatio = canvas.width / canvas.height
          
          if (options.resizeWidth && !options.resizeHeight) {
            newWidth = options.resizeWidth
            newHeight = Math.round(newWidth / aspectRatio)
          } else if (options.resizeHeight && !options.resizeWidth) {
            newHeight = options.resizeHeight
            newWidth = Math.round(newHeight * aspectRatio)
          } else if (options.resizeWidth && options.resizeHeight) {
            // Use the constraint that requires the smallest scale
            const scaleX = options.resizeWidth / canvas.width
            const scaleY = options.resizeHeight / canvas.height
            const scale = Math.min(scaleX, scaleY)
            
            newWidth = Math.round(canvas.width * scale)
            newHeight = Math.round(canvas.height * scale)
          }
        }

        const resizeCanvas = new OffscreenCanvas(newWidth, newHeight)
        resizeCanvas.width = newWidth
        resizeCanvas.height = newHeight
        const resizeCtx = resizeCanvas.getContext('2d')
        if (!resizeCtx) {
          throw new Error('Failed to get 2D context from resize canvas')
        }
        
        // Use high-quality scaling
        resizeCtx.imageSmoothingEnabled = true
        resizeCtx.imageSmoothingQuality = 'high'
        
        resizeCtx.drawImage(canvas, 0, 0, newWidth, newHeight)
        
        canvas.width = newWidth
        canvas.height = newHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(resizeCanvas, 0, 0)
      }

      // Convert to blob using OffscreenCanvas method
      const mimeType = `image/${options.format}`
      const quality = options.format === 'png' ? undefined : options.quality / 100
      
      // OffscreenCanvas convertToBlob method
      canvas.convertToBlob({ type: mimeType, quality })
        .then(resolve)
        .catch(reject)
        
    } catch (error) {
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
