'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImagePreviewProps {
  files: File[]
  selectedIndex: number | null
  onSelectImage: (index: number) => void
  processingOptions: any
}

export function ImagePreview({ 
  files, 
  selectedIndex, 
  onSelectImage,
  processingOptions 
}: ImagePreviewProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  useEffect(() => {
    // Create preview URLs for all files
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)

    // Cleanup URLs when component unmounts or files change
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [files])

  const currentIndex = selectedIndex ?? 0

  const goToPrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1
    onSelectImage(newIndex)
  }

  const goToNext = () => {
    const newIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0
    onSelectImage(newIndex)
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No images selected
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main preview */}
      <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
        {previewUrls[currentIndex] && (
          <img
            src={previewUrls[currentIndex]}
            alt={`Preview ${currentIndex + 1}`}
            className="w-full h-full object-contain"
          />
        )}
        
        {/* Navigation arrows */}
        {files.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Image counter */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} of {files.length}
        </div>
      </div>

      {/* Thumbnail strip */}
      {files.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {files.map((file, index) => (
            <button
              key={index}
              onClick={() => onSelectImage(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                index === currentIndex 
                  ? 'border-primary' 
                  : 'border-muted hover:border-muted-foreground'
              }`}
            >
              {previewUrls[index] && (
                <img
                  src={previewUrls[index]}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Processing info */}
      <div className="text-sm text-muted-foreground space-y-1">
        <div className="font-medium">Processing Settings:</div>
        {processingOptions.rotation !== 0 && (
          <div>• Rotation: {processingOptions.rotation}°</div>
        )}
        {(processingOptions.resizeWidth > 0 || processingOptions.resizeHeight > 0) && (
          <div>
            • Resize: {processingOptions.resizeWidth || 'auto'} × {processingOptions.resizeHeight || 'auto'}
            {processingOptions.maintainAspectRatio && ' (maintain aspect ratio)'}
          </div>
        )}
        <div>• Format: {processingOptions.format.toUpperCase()}</div>
        <div>• Quality: {processingOptions.quality}%</div>
      </div>
    </div>
  )
}
