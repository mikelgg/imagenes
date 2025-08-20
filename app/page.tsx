'use client'

import { useState } from 'react'
import { ImageUploader } from '@/components/image-uploader'
import { ProcessingOptions } from '@/components/processing-options'
import { ImagePreview } from '@/components/image-preview'
import { ProcessingProgress } from '@/components/processing-progress'
import { ConsentBanner } from '@/components/consent-banner'
import { ProcessedResult } from '@/components/processed-result'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Settings, Eye, Download } from 'lucide-react'

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
    projectName: 'processed-images'
  })
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 })
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [consentGiven, setConsentGiven] = useState(false)
  const [showConsentBanner, setShowConsentBanner] = useState(true)

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

    // Create web worker for image processing
    const worker = new Worker('/workers/image-processor.worker.js')
    
    const results: ProcessedImage[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Consent Banner */}
      {showConsentBanner && (
        <ConsentBanner
          onConsentChange={setConsentGiven}
          onDismiss={() => setShowConsentBanner(false)}
        />
      )}

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Camera className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Image Batch Processor</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Process up to 20 images with rotation, auto-cropping, and resizing. 
          All processing happens in your browser for maximum privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Upload Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploader
                onFilesSelected={handleFilesSelected}
                selectedFiles={selectedFiles}
                maxFiles={20}
              />
            </CardContent>
          </Card>

          {/* Processing Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Processing Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessingOptions
                options={processingOptions}
                onChange={handleOptionsChange}
                disabled={isProcessing}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Preview */}
          {selectedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImagePreview
                  files={selectedFiles}
                  selectedIndex={previewIndex}
                  onSelectImage={handlePreview}
                  processingOptions={processingOptions}
                />
              </CardContent>
            </Card>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <ProcessingProgress
                  current={processingProgress.current}
                  total={processingProgress.total}
                />
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {processedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProcessedResult
                  processedImages={processedImages}
                  projectName={processingOptions.projectName}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Process Button */}
      {selectedFiles.length > 0 && !isProcessing && (
        <div className="text-center">
          <button
            onClick={handleProcessImages}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors"
          >
            Process {selectedFiles.length} Images
          </button>
        </div>
      )}
    </div>
  )
}
