'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { MoveHorizontal, RotateCw, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreviewCompareProps {
  beforeImage: string | null
  afterImage: string | null
  className?: string
  rotation?: number
}

export function PreviewCompare({ 
  beforeImage, 
  afterImage, 
  className,
  rotation = 0 
}: PreviewCompareProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.max(0, Math.min(100, percentage)))
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!beforeImage && !afterImage) {
    return (
      <motion.div 
        className={cn(
          "aspect-video bg-muted rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted",
          className
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28 }}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ImageIcon className="h-12 w-12 mb-4" />
        </motion.div>
        <p className="text-sm font-medium">Selecciona una imagen para ver la vista previa</p>
        <p className="text-xs text-text-muted/70 mt-1">Arrastra y suelta o haz clic para cargar</p>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className={cn("relative aspect-video overflow-hidden rounded-xl bg-muted", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28 }}
      ref={containerRef}
    >
      {/* Before Image */}
      {beforeImage && (
        <motion.img
          src={beforeImage}
          alt="Imagen original"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* After Image */}
      {afterImage && (
        <motion.img
          src={afterImage}
          alt="Imagen procesada"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            clipPath: `inset(0 0 0 ${sliderPosition}%)`
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Slider */}
      <div 
        className="absolute inset-y-0 w-1 bg-white/80 backdrop-blur-sm cursor-ew-resize z-10 group"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleMouseDown}
      >
        {/* Slider Handle */}
        <motion.div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-ew-resize"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <MoveHorizontal className="h-4 w-4 text-gray-600" />
        </motion.div>
      </div>

      {/* Labels */}
      {beforeImage && afterImage && (
        <>
          <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full">
            Original
          </div>
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full">
            Procesada
          </div>
        </>
      )}

      {/* Rotation Indicator */}
      {rotation !== 0 && (
        <motion.div 
          className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full flex items-center gap-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <RotateCw className="h-3 w-3" />
          {rotation}°
        </motion.div>
      )}
    </motion.div>
  )
}
