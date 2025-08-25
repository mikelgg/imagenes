'use client'

import React from 'react'
import { RotateCw, RotateCcw, Rotate3D, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RotatePanelProps {
  rotation: number
  useGeometricCrop: boolean
  onChange: (options: { rotation?: number; useGeometricCrop?: boolean }) => void
  disabled?: boolean
}

export function RotatePanel({ rotation, useGeometricCrop, onChange, disabled }: RotatePanelProps) {
  const handleRotationChange = (value: number[]) => {
    onChange({ rotation: value[0] })
  }

  const handleQuickRotate = (degrees: number) => {
    onChange({ rotation: rotation + degrees })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0
    onChange({ rotation: value })
  }

  return (
    <div className="space-y-4">
      {/* Quick Rotation Buttons */}
      <div>
        <Label className="text-sm font-medium text-text-primary mb-2 block">
          Rotación Rápida
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleQuickRotate(-90)}
            disabled={disabled}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            90° ←
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleQuickRotate(180)}
            disabled={disabled}
            className="flex-1"
          >
            <Rotate3D className="h-4 w-4 mr-1" />
            180°
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleQuickRotate(90)}
            disabled={disabled}
            className="flex-1"
          >
            <RotateCw className="h-4 w-4 mr-1" />
            90° →
          </Button>
        </div>
      </div>

      {/* Rotation Slider */}
      <div>
        <Label className="text-sm font-medium text-text-primary mb-2 block">
          Ángulo: {rotation.toFixed(1)}°
        </Label>
        <Slider
          value={[rotation]}
          onValueChange={handleRotationChange}
          min={-180}
          max={180}
          step={0.1}
          disabled={disabled}
          className="mb-2"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={rotation}
            onChange={handleInputChange}
            disabled={disabled}
            className="w-20 text-center"
            step="0.1"
            min="-180"
            max="180"
          />
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickRotate(-5)}
              disabled={disabled}
              className="px-2"
            >
              -5°
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickRotate(-1)}
              disabled={disabled}
              className="px-2"
            >
              -1°
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickRotate(1)}
              disabled={disabled}
              className="px-2"
            >
              +1°
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickRotate(5)}
              disabled={disabled}
              className="px-2"
            >
              +5°
            </Button>
          </div>
        </div>
      </div>

      {/* Auto-crop Toggle */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
        <div>
          <Label htmlFor="auto-crop" className="text-sm font-medium text-text-primary">
            Auto-crop tras rotar
          </Label>
          <p className="text-xs text-text-muted">
            Elimina bordes automáticamente
          </p>
        </div>
        <Switch
          id="auto-crop"
          checked={useGeometricCrop}
          onCheckedChange={(checked) => onChange({ useGeometricCrop: checked })}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
