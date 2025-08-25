'use client'

import React from 'react'
import { Scissors, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CropPanelProps {
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
  onChange: (options: { cropX?: number; cropY?: number; cropWidth?: number; cropHeight?: number }) => void
  disabled?: boolean
}

export function CropPanel({ 
  cropX, 
  cropY, 
  cropWidth, 
  cropHeight, 
  onChange, 
  disabled 
}: CropPanelProps) {
  const handleInputChange = (field: string, value: string) => {
    const numValue = parseInt(value) || 0
    onChange({ [field]: numValue })
  }

  const handleReset = () => {
    onChange({
      cropX: 0,
      cropY: 0,
      cropWidth: 0,
      cropHeight: 0
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/20 p-2 rounded-lg">
        <p className="text-xs text-text-muted">
          <Scissors className="h-3 w-3 inline mr-1" />
          Deja los campos vacíos (0) para auto-crop geométrico
        </p>
      </div>

      {/* Crop Position */}
      <div>
        <Label className="text-sm font-medium text-text-primary mb-2 block">
          Posición (píxeles)
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="crop-x" className="text-xs text-text-muted">
              X (izquierda)
            </Label>
            <Input
              id="crop-x"
              type="number"
              value={cropX}
              onChange={(e) => handleInputChange('cropX', e.target.value)}
              disabled={disabled}
              min="0"
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="crop-y" className="text-xs text-text-muted">
              Y (arriba)
            </Label>
            <Input
              id="crop-y"
              type="number"
              value={cropY}
              onChange={(e) => handleInputChange('cropY', e.target.value)}
              disabled={disabled}
              min="0"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Crop Dimensions */}
      <div>
        <Label className="text-sm font-medium text-text-primary mb-2 block">
          Dimensiones (píxeles)
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="crop-width" className="text-xs text-text-muted">
              Ancho
            </Label>
            <Input
              id="crop-width"
              type="number"
              value={cropWidth}
              onChange={(e) => handleInputChange('cropWidth', e.target.value)}
              disabled={disabled}
              min="0"
              placeholder="Auto"
            />
          </div>
          <div>
            <Label htmlFor="crop-height" className="text-xs text-text-muted">
              Alto
            </Label>
            <Input
              id="crop-height"
              type="number"
              value={cropHeight}
              onChange={(e) => handleInputChange('cropHeight', e.target.value)}
              disabled={disabled}
              min="0"
              placeholder="Auto"
            />
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <Button
        variant="secondary"
        onClick={handleReset}
        disabled={disabled}
        size="sm"
        className="w-full"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reiniciar Corte
      </Button>
    </div>
  )
}
