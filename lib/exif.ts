/**
 * Removes EXIF metadata from image blobs while preserving image quality
 * @param blob - The original image blob
 * @returns Promise<Blob> - A new blob without EXIF metadata
 */
export async function stripExif(blob: Blob): Promise<Blob> {
  try {
    // Create image element to load the blob
    const img = new Image()
    const imageUrl = URL.createObjectURL(blob)
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = imageUrl
    })
    
    // Create canvas and draw image without metadata
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Cannot get 2D context')
    }
    
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    // Draw image to canvas (this strips EXIF automatically)
    ctx.drawImage(img, 0, 0)
    
    // Clean up object URL
    URL.revokeObjectURL(imageUrl)
    
    // Convert back to blob with appropriate format
    const mimeType = blob.type || 'image/jpeg'
    const quality = mimeType === 'image/jpeg' ? 0.92 : undefined
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      }, mimeType, quality)
    })
  } catch (error) {
    console.warn('Failed to strip EXIF, returning original blob:', error)
    return blob
  }
}
