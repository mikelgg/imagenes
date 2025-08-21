'use client'

import React from 'react'
import { Download, Image, FileType, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

interface ResizeExportPanelProps {
  resizeWidth: number
  resizeHeight: number
  maintainAspectRatio: boolean
  format: 'jpeg' | 'png' | 'webp'
  quality: number
  projectName: string
  onChange: (options: {
    resizeWidth?: number
    resizeHeight?: number
    maintainAspectRatio?: boolean
    format?: 'jpeg' | 'png' | 'webp'
    quality?: number
    projectName?: string
  }) => void
  disabled?: boolean
}

const SIZE_PRESETS = [
  { label: 'Original', width: 0, height: 0 },
  { label: '1024px', width: 1024, height: 1024 },
  { label: '2048px', width: 2048, height: 2048 },
  { label: '4096px', width: 4096, height: 4096 }
]

export function ResizeExportPanel({
  resizeWidth,
  resizeHeight,
  maintainAspectRatio,
  format,
  quality,
  projectName,
  onChange,
  disabled
}: ResizeExportPanelProps) {
  const handlePresetSelect = (preset: typeof SIZE_PRESETS[0]) => {
    onChange({
      resizeWidth: preset.width,
      resizeHeight: preset.height
    })
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === 'projectName') {
      onChange({ [field]: value })
    } else {
      const numValue = parseInt(value) || 0
      onChange({ [field]: numValue })
    }
  }

  const handleQualityChange = (value: number[]) => {
    onChange({ quality: value[0] })
  }

  return (
    <div className="space-y-6">
      {/* Size Presets */}
      <div>
        <Label className="text-sm font-medium text-text-primary mb-3 block">
          Presets de Tamaño
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {SIZE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="secondary"
              size="sm"
              onClick={() => handlePresetSelect(preset)}
              disabled={disabled}
              className={`${
                resizeWidth === preset.width && resizeHeight === preset.height
                  ? 'ring-2 ring-primary/30 border-primary'
                  : ''
              }`}
            >
              <Image className="h-3 w-3 mr-2" />
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Dimensions */}
      <div>
        <Label className="text-sm font-medium text-text-primary mb-3 block">
          Dimensiones Personalizadas
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="resize-width" className="text-xs text-text-muted">
              Ancho (px)
            </Label>
            <Input
              id="resize-width"
              type="number"
              value={resizeWidth}
              onChange={(e) => handleInputChange('resizeWidth', e.target.value)}
              disabled={disabled}
              min="0"
              placeholder="Original"
            />
          </div>
          <div>
            <Label htmlFor="resize-height" className="text-xs text-text-muted">
              Alto (px)
            </Label>
            <Input
              id="resize-height"
              type="number"
              value={resizeHeight}
              onChange={(e) => handleInputChange('resizeHeight', e.target.value)}
              disabled={disabled}
              min="0"
              placeholder="Original"
            />
          </div>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Deja en 0 para mantener el tamaño original
        </p>
      </div>

      {/* Format Selection */}
      <div>
        <Label className="text-sm font-medium text-text-primary mb-3 block">
          Formato de Exportación
        </Label>
        <Select
          value={format}
          onValueChange={(value: 'jpeg' | 'png' | 'webp') => onChange({ format: value })}
          disabled={disabled}
        >
          <SelectTrigger>
            <FileType className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Seleccionar formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jpeg">JPEG (menor tamaño)</SelectItem>
            <SelectItem value="png">PNG (sin pérdida)</SelectItem>
            <SelectItem value="webp">WebP (moderno)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quality Slider (only for JPEG) */}
      {format === 'jpeg' && (
        <div>
          <Label className="text-sm font-medium text-text-primary mb-3 block">
            Calidad JPEG: {quality}%
          </Label>
          <Slider
            value={[quality]}
            onValueChange={handleQualityChange}
            min={1}
            max={100}
            step={1}
            disabled={disabled}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>Menor tamaño</span>
            <span>Mejor calidad</span>
          </div>
        </div>
      )}

      {/* Project Name */}
      <div>
        <Label htmlFor="project-name" className="text-sm font-medium text-text-primary mb-3 block">
          Nombre del Proyecto
        </Label>
        <Input
          id="project-name"
          type="text"
          value={projectName}
          onChange={(e) => handleInputChange('projectName', e.target.value)}
          disabled={disabled}
          placeholder="mi-proyecto"
        />
        <p className="text-xs text-text-muted mt-2">
          Se usará para nombrar la carpeta del ZIP descargado
        </p>
      </div>
    </div>
  )
}
