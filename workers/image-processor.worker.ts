/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

interface ProcessingOptions {
  rotation: number
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
  resizeWidth: number
  resizeHeight: number
  maintainAspectRatio: boolean
  quality: number
  format: 'jpeg' | 'png' | 'webp'
  preserveExif: boolean
  projectName: string
}

interface WorkerMessage {
  file: File
  options: ProcessingOptions
}

// Image processing functions
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

function calculateInscribedRectangle(width: number, height: number, angleDegrees: number): {
  width: number
  height: number
  x: number
  y: number
} {
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

function processImage(img: HTMLImageElement, options: ProcessingOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = new OffscreenCanvas(img.width, img.height)
      const ctx = canvas.getContext('2d')!

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
        const croppedCtx = croppedCanvas.getContext('2d')!
        
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
        const cropCtx = cropCanvas.getContext('2d')!
        
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
        const resizeCtx = resizeCanvas.getContext('2d')!
        
        // Use high-quality scaling
        resizeCtx.imageSmoothingEnabled = true
        resizeCtx.imageSmoothingQuality = 'high'
        
        resizeCtx.drawImage(canvas, 0, 0, newWidth, newHeight)
        
        canvas.width = newWidth
        canvas.height = newHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(resizeCanvas, 0, 0)
      }

      // Convert to blob
      const mimeType = `image/${options.format}`
      const quality = options.format === 'png' ? undefined : options.quality / 100
      
      canvas.convertToBlob({ type: mimeType, quality })
        .then(resolve)
        .catch(reject)
        
    } catch (error) {
      reject(error)
    }
  })
}

// Worker message handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const { file, options } = e.data

    // Load image
    const img = await loadImage(file)
    
    // Process image
    const blob = await processImage(img, options)
    
    // Send result back
    self.postMessage({
      success: true,
      result: { blob }
    })
    
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export {}
