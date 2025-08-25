'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ImageUploader } from '@/components/image-uploader'
import { ProcessedResult } from '@/components/processed-result'
import { BatchProgress } from '@/components/batch-progress'
import { PreviewCompare } from '@/components/preview-compare'
import { EditorLayout } from '@/components/editor-layout'
import { Panel } from '@/components/ui/panel'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { FooterNote } from '@/components/footer-note'
import { ControlsToolbar } from '@/components/controls-toolbar'
import { stripExif } from '@/lib/exif'
import { 
  Camera, 
  Eye, 
  Download, 
  Upload,
  Scissors,
  Zap,
  Shield,
  Cpu,
  CheckCircle
} from 'lucide-react'

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
  shavePixels: number
  useGeometricCrop: boolean
}

interface ProcessedImage {
  originalFile: File
  processedBlob: Blob
  filename: string
  success: boolean
  error?: string
}

export default function HomePage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    rotation: 0,
    cropX: 0,
    cropY: 0,
    cropWidth: 0,
    cropHeight: 0,
    resizeWidth: 0,
    resizeHeight: 0,
    maintainAspectRatio: true,
    quality: 90,
    format: 'jpeg',
    preserveExif: false, // Always remove EXIF by default
    projectName: 'processed-images',
    shavePixels: 1,
    useGeometricCrop: true
  })
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 })
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [consentGiven, setConsentGiven] = useState(false)
  const [currentFileName, setCurrentFileName] = useState<string>('')
  const [showExifToast, setShowExifToast] = useState(false)
  const [showS3Toast, setShowS3Toast] = useState(false)
  const [showS3ErrorToast, setShowS3ErrorToast] = useState(false)
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      
      const isCtrlOrCmd = e.ctrlKey || e.metaKey
      
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        const increment = e.shiftKey ? 5 : 1
        setProcessingOptions(prev => ({ 
          ...prev, 
          rotation: prev.rotation + increment 
        }))
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        const increment = e.shiftKey ? 5 : 1
        setProcessingOptions(prev => ({ 
          ...prev, 
          rotation: prev.rotation - increment 
        }))
      } else if (isCtrlOrCmd && e.key === 's') {
        e.preventDefault()
        if (processedImages.length > 0) {
          handleDownloadAll()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [processedImages])
  
  const handleDownloadAll = useCallback(() => {
    // Implementar descarga masiva
    console.log('Downloading all processed images...')
  }, [])
  
  const handleSaveTemporary = useCallback(() => {
    // Implementar guardado temporal
    console.log('Saving temporary...')
  }, [])
  
  const handleHelp = useCallback(() => {
    // Mostrar modal de ayuda con atajos de teclado
    console.log('Show help modal...')
  }, [])

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files)
    setProcessedImages([])
  }

  const handleOptionsChange = (options: Partial<ProcessingOptions>) => {
    setProcessingOptions(prev => ({ ...prev, ...options }))
  }

  const handlePreview = (index: number) => {
    setPreviewIndex(index)
  }

  const handleProcessImages = async () => {
    if (selectedFiles.length === 0) return

    setIsProcessing(true)
    setProcessingProgress({ current: 0, total: selectedFiles.length })
    setProcessedImages([])
    setCurrentFileName('')

    // Create web worker for image processing (ES Module)
    const worker = new Worker('/workers/image-processor.worker.mjs', { type: 'module' })
    
    const results: ProcessedImage[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      setCurrentFileName(file.name)
      
      try {
        // Process image in web worker
        let result = await processImageInWorker(worker, file, processingOptions, i + 1)
        
        // Strip EXIF metadata from processed blob
        const cleanBlob = await stripExif(result.processedBlob)
        result = { ...result, processedBlob: cleanBlob }
        
        results.push(result)
        setProcessingProgress({ current: i + 1, total: selectedFiles.length })
      } catch (error) {
        results.push({
          originalFile: file,
          processedBlob: new Blob(),
          filename: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    worker.terminate()
    setProcessedImages(results)
    setIsProcessing(false)
    setCurrentFileName('')

    // Show EXIF removal toast
    const successfulCount = results.filter(r => r.success).length
    if (successfulCount > 0) {
      setShowExifToast(true)
      setTimeout(() => setShowExifToast(false), 5000) // Hide after 5 seconds
    }

    // If consent was given, send one image to backend
    if (consentGiven && results.length > 0) {
      const successfulResults = results.filter(r => r.success)
      if (successfulResults.length > 0) {
        await uploadSampleImage(successfulResults[0])
      }
    }
  }

  const processImageInWorker = (
    worker: Worker, 
    file: File, 
    options: ProcessingOptions, 
    index: number
  ): Promise<ProcessedImage> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Processing timeout'))
      }, 30000) // 30 second timeout

      worker.onmessage = (e) => {
        clearTimeout(timeout)
        const { success, result, error } = e.data
        
        if (success) {
          resolve({
            originalFile: file,
            processedBlob: result.blob,
            filename: `${options.projectName}_${String(index).padStart(3, '0')}.${options.format}`,
            success: true
          })
        } else {
          reject(new Error(error))
        }
      }

      worker.onerror = (error) => {
        clearTimeout(timeout)
        reject(error)
      }

      // Send file and options to worker
      worker.postMessage({
        file,
        options
      })
    })
  }

  const uploadSampleImage = async (processedImage: ProcessedImage) => {
    try {
      // Step 1: Get presigned URL from our API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: processedImage.filename,
          contentType: processedImage.processedBlob.type,
          fileSize: processedImage.processedBlob.size,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get upload URL: ${response.status}`)
      }

      const { url, headers } = await response.json()

      // Step 2: Upload directly to S3 using presigned URL
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: headers,
        body: processedImage.processedBlob,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to S3: ${uploadResponse.status}`)
      }

      // Show success toast
      setShowS3Toast(true)
      setTimeout(() => setShowS3Toast(false), 4000)

    } catch (error) {
      console.error('Failed to upload sample image:', error)
      // Show error toast
      setShowS3ErrorToast(true)
      setTimeout(() => setShowS3ErrorToast(false), 4000)
    }
  }

  // Upload Panel
  const uploadPanel = selectedFiles.length === 0 ? (
    <div className="text-center space-y-4 py-6">
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-3">
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1] 
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Camera className="h-12 w-12 text-primary mx-auto" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-text-primary mb-1">
              Image Processor
            </h1>
            <h2 className="text-lg font-semibold text-primary tracking-tight">
              Geometric Crop Engine
            </h2>
          </div>
        </div>
        
        <p className="text-text-muted text-base max-w-md mx-auto leading-relaxed">
          Algoritmo geométrico determinista. 
          <span className="text-primary font-medium">Cero bordes garantizado</span>.
        </p>
        
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {[
            { icon: Cpu, label: 'Geometric\nAlgorithm' },
            { icon: Zap, label: 'Web Worker\nPerformance' },
            { icon: Shield, label: 'Browser\nOnly' }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              className="text-center p-2 rounded-lg bg-surface/50 border border-border"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
            >
              <feature.icon className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-text-muted whitespace-pre-line">
                {feature.label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <Panel delay={0.3}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-primary" />
            Cargar Imágenes
          </CardTitle>
          <CardDescription>
            Selecciona hasta 20 imágenes para procesar en lote
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploader
            onFilesSelected={handleFilesSelected}
            selectedFiles={selectedFiles}
            maxFiles={20}
          />
        </CardContent>
      </Panel>
    </div>
  ) : null

  // Toolbar Panel - Controls (only show when files are selected)
  const toolbarPanel = selectedFiles.length > 0 ? (
    <div className="space-y-4">
      {/* File Upload - Compact version when files are selected */}
      <Panel delay={0}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-base">
            <Upload className="h-4 w-4 text-primary" />
            Archivos Seleccionados ({selectedFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ImageUploader
            onFilesSelected={handleFilesSelected}
            selectedFiles={selectedFiles}
            maxFiles={20}
            compact={true}
          />
        </CardContent>
      </Panel>

      {/* Controls Toolbar */}
      <ControlsToolbar
        options={processingOptions}
        onChange={handleOptionsChange}
        disabled={isProcessing}
        showExifNotice={true}
      />

      {/* Consent Checkbox */}
      <motion.div
        className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <input
          type="checkbox"
          id="consent-checkbox"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="h-4 w-4 text-primary bg-surface border-border rounded focus:ring-primary focus:ring-2"
        />
        <label 
          htmlFor="consent-checkbox" 
          className="text-xs text-text-muted cursor-pointer flex-1"
        >
          Permitir guardar <strong>1 muestra</strong> temporalmente (24h) para mejorar el servicio
        </label>
      </motion.div>

      {/* Process Button */}
      {!isProcessing && (
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button
            onClick={handleProcessImages}
            size="xl"
            className="w-full relative overflow-hidden group"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <Scissors className="h-5 w-5 mr-3" />
            Procesar {selectedFiles.length} Imagen{selectedFiles.length !== 1 ? 'es' : ''}
          </Button>
          
          <p className="text-xs text-text-muted mt-2">
            Atajos: R/L para rotar, Shift+R/L ±5°, Ctrl+S descargar
          </p>
        </motion.div>
      )}
    </div>
  ) : null

  // Preview Panel
  const previewPanel = (
    <div className="space-y-6">
      {/* Preview */}
      {selectedFiles.length > 0 && (
        <Panel delay={0.1}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              Vista Previa
            </CardTitle>
            <CardDescription>
              Comparación antes/después con slider interactivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreviewCompare
              beforeImage={previewIndex !== null ? URL.createObjectURL(selectedFiles[previewIndex]) : null}
              afterImage={null} // TODO: Generate processed preview
              rotation={processingOptions.rotation}
            />
            
            {selectedFiles.length > 1 && (
              <div className="mt-4">
                <p className="text-sm text-text-muted mb-2">
                  Imagen {(previewIndex ?? 0) + 1} de {selectedFiles.length}
                </p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedFiles.slice(0, 6).map((file, index) => (
                    <motion.button
                      key={index}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        previewIndex === index 
                          ? 'border-primary shadow-glow-sm' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setPreviewIndex(index)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </motion.button>
                  ))}
                  {selectedFiles.length > 6 && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-border bg-muted flex items-center justify-center">
                      <span className="text-xs text-text-muted">+{selectedFiles.length - 6}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Panel>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <Panel delay={0}>
          <CardContent className="p-6">
            <BatchProgress
              current={processingProgress.current}
              total={processingProgress.total}
              currentFileName={currentFileName}
              status="processing"
            />
          </CardContent>
        </Panel>
      )}

      {/* Results */}
      {processedImages.length > 0 && (
        <Panel delay={0.1}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              Resultados
            </CardTitle>
            <CardDescription>
              {processedImages.filter(img => img.success).length} de {processedImages.length} imágenes procesadas exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProcessedResult
              processedImages={processedImages}
              projectName={processingOptions.projectName}
            />
          </CardContent>
        </Panel>
      )}
    </div>
  )

  return (
    <>
      <EditorLayout 
        uploadPanel={uploadPanel}
        toolbarPanel={toolbarPanel}
        previewPanel={previewPanel}
      />

      {/* EXIF Removal Toast */}
      {showExifToast && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-surface border border-border rounded-xl p-4 shadow-lg max-w-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Procesado completado
                </p>
                <p className="text-xs text-text-muted">
                  EXIF eliminado de las imágenes exportadas
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* S3 Success Toast */}
      {showS3Toast && (
        <motion.div
          className="fixed bottom-6 left-6 z-50"
          initial={{ opacity: 0, x: -100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -100, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-surface border border-border rounded-xl p-4 shadow-lg max-w-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Muestra guardada
                </p>
                <p className="text-xs text-text-muted">
                  Auto-borrado en 24h. Gracias por ayudar a mejorar el servicio
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* S3 Error Toast */}
      {showS3ErrorToast && (
        <motion.div
          className="fixed bottom-6 left-6 z-50"
          initial={{ opacity: 0, x: -100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -100, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-surface border border-destructive/50 rounded-xl p-4 shadow-lg max-w-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 bg-destructive rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Error al guardar muestra
                </p>
                <p className="text-xs text-text-muted">
                  El procesado continuó normalmente
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <FooterNote />
    </>
  )
}
