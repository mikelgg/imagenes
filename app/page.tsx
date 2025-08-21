'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ImageUploader } from '@/components/image-uploader'
import { ProcessingOptions } from '@/components/processing-options'
import { ImagePreview } from '@/components/image-preview'
import { ProcessingProgress } from '@/components/processing-progress'
import { ConsentBanner } from '@/components/consent-banner'
import { ProcessedResult } from '@/components/processed-result'
import { BatchProgress } from '@/components/batch-progress'
import { PreviewCompare } from '@/components/preview-compare'
import { EditorLayout } from '@/components/editor-layout'
import { Panel } from '@/components/ui/panel'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { 
  Camera, 
  Settings, 
  Eye, 
  Download, 
  Upload,
  Scissors,
  RotateCw,
  RotateCcw,
  Zap,
  Shield,
  Cpu
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
    preserveExif: true,
    projectName: 'processed-images',
    shavePixels: 1,
    useGeometricCrop: true
  })
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 })
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [consentGiven, setConsentGiven] = useState(false)
  const [showConsentBanner, setShowConsentBanner] = useState(true)
  const [currentFileName, setCurrentFileName] = useState<string>('')
  
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
        const result = await processImageInWorker(worker, file, processingOptions, i + 1)
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
      const formData = new FormData()
      const batchId = crypto.randomUUID()
      
      formData.append('image', processedImage.processedBlob, processedImage.filename)
      formData.append('batchId', batchId)
      formData.append('createdAt', new Date().toISOString())

      await fetch('/api/temp-upload', {
        method: 'POST',
        body: formData
      })
    } catch (error) {
      console.error('Failed to upload sample image:', error)
      // Don't show error to user as this is optional
    }
  }

  const leftPanel = (
    <div className="space-y-6">
      {/* Hero Section */}
      {selectedFiles.length === 0 && (
        <motion.div 
          className="text-center space-y-6 py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-4">
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
              <Camera className="h-16 w-16 text-primary mx-auto" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold tracking-tighter text-text-primary mb-2">
                Image Processor
              </h1>
              <h2 className="text-xl font-semibold text-primary tracking-tight">
                Geometric Crop Engine
              </h2>
            </div>
          </div>
          
          <p className="text-text-muted text-lg max-w-md mx-auto leading-relaxed">
            Procesamiento avanzado con algoritmo geométrico determinista. 
            <span className="text-primary font-medium">Cero bordes garantizado</span>.
          </p>
          
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { icon: Cpu, label: 'Geometric\nAlgorithm' },
              { icon: Zap, label: 'Web Worker\nPerformance' },
              { icon: Shield, label: 'Browser\nOnly' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                className="text-center p-3 rounded-xl bg-surface/50 border border-border"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
              >
                <feature.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-text-muted whitespace-pre-line">
                  {feature.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* File Upload */}
      <Panel delay={0.1}>
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

      {/* Processing Options */}
      {selectedFiles.length > 0 && (
        <Panel delay={0.2}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              Opciones de Procesamiento
            </CardTitle>
            <CardDescription>
              Configurar rotación, recorte geométrico y formato de salida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProcessingOptions
              options={processingOptions}
              onChange={handleOptionsChange}
              disabled={isProcessing}
            />
            
            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-text-muted mb-4">Acciones Rápidas</p>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setProcessingOptions(prev => ({ ...prev, rotation: prev.rotation - 5 }))}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  -5°
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setProcessingOptions(prev => ({ ...prev, rotation: prev.rotation + 5 }))}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  +5°
                </Button>
              </div>
            </div>
          </CardContent>
        </Panel>
      )}
    </div>
  )

  const rightPanel = (
    <div className="space-y-6">
      {/* Preview */}
      {selectedFiles.length > 0 && (
        <Panel delay={0.3}>
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

      {/* Process Button */}
      {selectedFiles.length > 0 && !isProcessing && (
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
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
  )

  return (
    <>
      <Header 
        onDownloadAll={handleDownloadAll}
        onSaveTemporary={handleSaveTemporary}
        onHelp={handleHelp}
        hasProcessedImages={processedImages.length > 0}
      />
      
      {/* Consent Banner */}
      {showConsentBanner && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
        >
          <ConsentBanner
            onConsentChange={setConsentGiven}
            onDismiss={() => setShowConsentBanner(false)}
          />
        </motion.div>
      )}

      <EditorLayout 
        leftPanel={leftPanel}
        rightPanel={rightPanel}
      />
    </>
  )
}
