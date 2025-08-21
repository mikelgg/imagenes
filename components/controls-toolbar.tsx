'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { RotateCw, Scissors, Download, Info } from 'lucide-react'
import { Accordion } from '@/components/ui/accordion'
import { RotatePanel } from '@/components/controls/rotate-panel'
import { CropPanel } from '@/components/controls/crop-panel'
import { ResizeExportPanel } from '@/components/controls/resize-export-panel'

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

interface ControlsToolbarProps {
  options: ProcessingOptions
  onChange: (options: Partial<ProcessingOptions>) => void
  disabled?: boolean
  showExifNotice?: boolean
}

export function ControlsToolbar({ 
  options, 
  onChange, 
  disabled = false,
  showExifNotice = true 
}: ControlsToolbarProps) {
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rotate Panel - Always Open */}
        <Accordion
          title="Rotar"
          icon={<RotateCw className="h-4 w-4" />}
          defaultOpen={true}
          disabled={true} // Cannot be collapsed
          className="lg:col-span-1"
        >
          <RotatePanel
            rotation={options.rotation}
            useGeometricCrop={options.useGeometricCrop}
            onChange={onChange}
            disabled={disabled}
          />
        </Accordion>

        {/* Crop Panel - Collapsed by default */}
        <Accordion
          title="Cortar"
          icon={<Scissors className="h-4 w-4" />}
          defaultOpen={false}
          className="lg:col-span-1"
        >
          <CropPanel
            cropX={options.cropX}
            cropY={options.cropY}
            cropWidth={options.cropWidth}
            cropHeight={options.cropHeight}
            onChange={onChange}
            disabled={disabled}
          />
        </Accordion>

        {/* Resize & Export Panel - Collapsed by default */}
        <Accordion
          title="Redimensionar & Exportar"
          icon={<Download className="h-4 w-4" />}
          defaultOpen={false}
          className="lg:col-span-1"
        >
          <ResizeExportPanel
            resizeWidth={options.resizeWidth}
            resizeHeight={options.resizeHeight}
            maintainAspectRatio={options.maintainAspectRatio}
            format={options.format}
            quality={options.quality}
            projectName={options.projectName}
            onChange={onChange}
            disabled={disabled}
          />
        </Accordion>
      </div>

      {/* EXIF Notice */}
      {showExifNotice && (
        <motion.div
          className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Info className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-xs text-text-muted">
            <strong>Privacidad:</strong> Los metadatos EXIF serán eliminados automáticamente 
            para proteger tu privacidad y evitar coincidencias exactas con la imagen original.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
