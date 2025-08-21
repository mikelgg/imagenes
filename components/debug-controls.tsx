'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DebugControlsProps {
  onThresholdChange: (threshold: number) => void
  onOvercropChange: (pixels: number) => void
  onTestAngles: () => void
  currentThreshold: number
  currentOvercrop: number
  isDebugMode: boolean
}

export function DebugControls({
  onThresholdChange,
  onOvercropChange,
  onTestAngles,
  currentThreshold,
  currentOvercrop,
  isDebugMode
}: DebugControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isDebugMode) return null

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔧 Controles de Debug</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Ocultar' : 'Mostrar'}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Threshold Alpha */}
          <div className="space-y-2">
            <Label htmlFor="threshold-slider">
              Threshold Alpha: {currentThreshold}
            </Label>
            <Slider
              id="threshold-slider"
              min={0}
              max={24}
              step={4}
              value={[currentThreshold]}
              onValueChange={([value]) => onThresholdChange(value)}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Valores recomendados: 8-16 para rotaciones, 0 para sin rotación
            </div>
          </div>

          {/* Overcrop */}
          <div className="space-y-2">
            <Label htmlFor="overcrop-slider">
              Overcrop: +{currentOvercrop}px
            </Label>
            <Slider
              id="overcrop-slider"
              min={0}
              max={2}
              step={1}
              value={[currentOvercrop]}
              onValueChange={([value]) => onOvercropChange(value)}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              Píxeles adicionales a recortar para eliminar halo residual
            </div>
          </div>

          {/* Test Angles */}
          <div className="space-y-2">
            <Button
              onClick={onTestAngles}
              variant="outline"
              className="w-full"
            >
              🧪 Probar Batería de Ángulos
            </Button>
            <div className="text-xs text-muted-foreground">
              Prueba automática con ángulos: 1°, 5°, 12°, 17°, 23°, 37°, 45°, 61°, 89°
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-muted rounded-md">
            <div className="text-xs space-y-1">
              <div><strong>Threshold Alpha:</strong> Elimina píxeles con transparencia ≤ valor</div>
              <div><strong>Overcrop:</strong> Recorta píxeles adicionales para eliminar halo</div>
              <div><strong>Debug Mode:</strong> Muestra overlays de bounding box y máscara alpha</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
