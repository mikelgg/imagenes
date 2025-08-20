'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { RotateCw, Crop, Expand, Settings } from 'lucide-react'

interface ProcessingOptionsProps {
  options: {
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
  onChange: (options: Partial<ProcessingOptionsProps['options']>) => void
  disabled?: boolean
}

export function ProcessingOptions({ options, onChange, disabled }: ProcessingOptionsProps) {
  const rotationPresets = [
    { label: 'No rotation', value: 0 },
    { label: '90° Right', value: 90 },
    { label: '180°', value: 180 },
    { label: '270° Left', value: 270 },
  ]

  return (
    <div className="space-y-6">
      {/* Project Name */}
      <div className="space-y-2">
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          value={options.projectName}
          onChange={(e) => onChange({ projectName: e.target.value })}
          placeholder="my-project"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Used for folder and file naming
        </p>
      </div>

      {/* Rotation */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <RotateCw className="h-4 w-4" />
          Rotation
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {rotationPresets.map((preset) => (
            <Button
              key={preset.value}
              variant={options.rotation === preset.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ rotation: preset.value })}
              disabled={disabled}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="rotation-slider">Custom Angle: {options.rotation}°</Label>
          <Slider
            id="rotation-slider"
            value={[options.rotation]}
            onValueChange={([value]) => onChange({ rotation: value })}
            max={360}
            min={-360}
            step={1}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Crop */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Crop className="h-4 w-4" />
          Crop (after rotation)
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="crop-x">X Position</Label>
            <Input
              id="crop-x"
              type="number"
              value={options.cropX}
              onChange={(e) => onChange({ cropX: parseInt(e.target.value) || 0 })}
              placeholder="0"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="crop-y">Y Position</Label>
            <Input
              id="crop-y"
              type="number"
              value={options.cropY}
              onChange={(e) => onChange({ cropY: parseInt(e.target.value) || 0 })}
              placeholder="0"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="crop-width">Width</Label>
            <Input
              id="crop-width"
              type="number"
              value={options.cropWidth}
              onChange={(e) => onChange({ cropWidth: parseInt(e.target.value) || 0 })}
              placeholder="Auto"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="crop-height">Height</Label>
            <Input
              id="crop-height"
              type="number"
              value={options.cropHeight}
              onChange={(e) => onChange({ cropHeight: parseInt(e.target.value) || 0 })}
              placeholder="Auto"
              disabled={disabled}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave empty for auto-crop to remove rotation borders
        </p>
      </div>

      {/* Resize */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Expand className="h-4 w-4" />
          Resize (optional)
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="resize-width">Width</Label>
            <Input
              id="resize-width"
              type="number"
              value={options.resizeWidth || ''}
              onChange={(e) => onChange({ resizeWidth: parseInt(e.target.value) || 0 })}
              placeholder="Original"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="resize-height">Height</Label>
            <Input
              id="resize-height"
              type="number"
              value={options.resizeHeight || ''}
              onChange={(e) => onChange({ resizeHeight: parseInt(e.target.value) || 0 })}
              placeholder="Original"
              disabled={disabled}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="maintain-aspect"
            checked={options.maintainAspectRatio}
            onCheckedChange={(checked) => onChange({ maintainAspectRatio: checked as boolean })}
            disabled={disabled}
          />
          <Label htmlFor="maintain-aspect">Maintain aspect ratio</Label>
        </div>
      </div>

      {/* Output Settings */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Output Settings
        </Label>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="format">Format</Label>
            <Select 
              value={options.format} 
              onValueChange={(value: 'jpeg' | 'png' | 'webp') => onChange({ format: value })}
              disabled={disabled}
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="quality-slider">Quality: {options.quality}%</Label>
            <Slider
              id="quality-slider"
              value={[options.quality]}
              onValueChange={([value]) => onChange({ quality: value })}
              max={100}
              min={10}
              step={5}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="preserve-exif"
            checked={options.preserveExif}
            onCheckedChange={(checked) => onChange({ preserveExif: checked as boolean })}
            disabled={disabled}
          />
          <Label htmlFor="preserve-exif">Preserve EXIF metadata</Label>
        </div>
      </div>
    </div>
  )
}
