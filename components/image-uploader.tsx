'use client'

import { useCallback, useState } from 'react'
import { Upload, X, File, AlertCircle } from 'lucide-react'
import { cn, formatFileSize, validateImageFiles } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void
  selectedFiles: File[]
  maxFiles?: number
  maxFileSize?: number // in bytes
  compact?: boolean
}

export function ImageUploader({ 
  onFilesSelected, 
  selectedFiles, 
  maxFiles = 20,
  maxFileSize = 10 * 1024 * 1024, // 10MB - soft limit
  compact = false
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [showSizeWarning, setShowSizeWarning] = useState(false)
  const [largeFiles, setLargeFiles] = useState<File[]>([])

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newErrors: string[] = []

    // Validate file count
    if (selectedFiles.length + fileArray.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`)
      setErrors(newErrors)
      return
    }

    // Validate file types and sizes
    const { valid: initialValid, invalid } = validateImageFiles(fileArray)
    
    if (invalid.length > 0) {
      newErrors.push(`${invalid.length} files are not valid images (JPG, PNG, WEBP only)`)
    }

    const oversizedFiles = initialValid.filter(file => file.size > maxFileSize)
    let valid = initialValid
    if (oversizedFiles.length > 0) {
      // Show soft warning instead of rejecting files
      setLargeFiles(oversizedFiles)
      setShowSizeWarning(true)
      // Don't filter out large files - allow them to proceed
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
    } else {
      setErrors([])
    }

    if (valid.length > 0) {
      const newFiles = [...selectedFiles, ...valid]
      onFilesSelected(newFiles)
    }
  }, [selectedFiles, maxFiles, maxFileSize, onFilesSelected])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input value so the same file can be selected again
    e.target.value = ''
  }, [handleFiles])

  const removeFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    onFilesSelected(newFiles)
    setErrors([])
  }, [selectedFiles, onFilesSelected])

  const clearAll = useCallback(() => {
    onFilesSelected([])
    setErrors([])
  }, [onFilesSelected])

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg text-center transition-colors",
          compact ? "p-4" : "p-8",
          isDragOver 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          selectedFiles.length > 0 && "border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!compact ? (
          <>
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Drop images here or click to browse
            </h3>
            <p className="text-muted-foreground mb-4">
              Support JPG, PNG, WEBP • Max {maxFiles} files
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Añadir más imágenes
            </span>
          </div>
        )}
        
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          id={compact ? "file-upload-compact" : "file-upload"}
        />
        
        <Button asChild variant={compact ? "secondary" : "outline"} size={compact ? "sm" : "default"}>
          <label htmlFor={compact ? "file-upload-compact" : "file-upload"} className="cursor-pointer">
            {compact ? "Añadir" : "Choose Files"}
          </label>
        </Button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Upload Errors</span>
          </div>
          <ul className="text-sm text-destructive space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Size Warning Dialog */}
      {showSizeWarning && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-3">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Imagen grande</span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            Puede tardar más en procesar en móviles.
          </p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => {
                setShowSizeWarning(false)
                setLargeFiles([])
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Continuar
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setShowSizeWarning(false)
                setLargeFiles([])
                // Remove large files from selection
                const filteredFiles = selectedFiles.filter(file => !largeFiles.includes(file))
                onFilesSelected(filteredFiles)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              Selected Files ({selectedFiles.length}/{maxFiles})
            </span>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>
          
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <File className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{file.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
