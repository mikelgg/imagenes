'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, CheckCircle, XCircle, Package } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'
import JSZip from 'jszip'

interface ProcessedImage {
  originalFile: File
  processedBlob: Blob
  filename: string
  success: boolean
  error?: string
}

interface ProcessedResultProps {
  processedImages: ProcessedImage[]
  projectName: string
}

export function ProcessedResult({ processedImages, projectName }: ProcessedResultProps) {
  const [isGeneratingZip, setIsGeneratingZip] = useState(false)

  const successfulImages = processedImages.filter(img => img.success)
  const failedImages = processedImages.filter(img => !img.success)

  const downloadZip = async () => {
    if (successfulImages.length === 0) return

    setIsGeneratingZip(true)
    
    try {
      const zip = new JSZip()
      const folder = zip.folder(projectName)

      // Add all successful images to the ZIP
      for (const image of successfulImages) {
        if (folder) {
          folder.file(image.filename, image.processedBlob)
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      
      // Create download link
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${projectName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error generating ZIP:', error)
    } finally {
      setIsGeneratingZip(false)
    }
  }

  const downloadIndividual = (image: ProcessedImage) => {
    const url = URL.createObjectURL(image.processedBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = image.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-2xl font-bold text-primary">{processedImages.length}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-green-600">{successfulImages.length}</div>
          <div className="text-sm text-muted-foreground">Successful</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-red-600">{failedImages.length}</div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
      </div>

      {/* Download All Button */}
      {successfulImages.length > 0 && (
        <div className="text-center">
          <Button 
            onClick={downloadZip}
            disabled={isGeneratingZip}
            size="lg"
            className="gap-2"
          >
            {isGeneratingZip ? (
              <>
                <Package className="h-4 w-4 animate-pulse" />
                Generating ZIP...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download All ({successfulImages.length} images)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Individual Results */}
      <div className="space-y-3">
        <h4 className="font-medium">Individual Results</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {processedImages.map((image, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                image.success 
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                  : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {image.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
                
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{image.filename}</div>
                  {image.success ? (
                    <div className="text-sm text-muted-foreground">
                      {formatFileSize(image.processedBlob.size)}
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      {image.error || 'Processing failed'}
                    </div>
                  )}
                </div>
              </div>

              {image.success && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadIndividual(image)}
                  className="flex-shrink-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="text-sm text-muted-foreground space-y-1">
        <div className="font-medium">💡 Tips:</div>
        <div>• Images are processed with rotation, auto-cropping, and quality settings</div>
        <div>• Auto-cropping removes transparent/white borders from rotated images</div>
        <div>• ZIP file contains all successfully processed images</div>
        <div>• You can download individual images using the download buttons</div>
        {failedImages.length > 0 && (
          <div className="text-amber-600">• Some images failed - check file format and size</div>
        )}
      </div>
    </div>
  )
}
