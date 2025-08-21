'use client'

import { Camera, Download, Save, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface HeaderProps {
  onDownloadAll?: () => void
  onSaveTemporary?: () => void
  onHelp?: () => void
  hasProcessedImages?: boolean
}

export function Header({ 
  onDownloadAll, 
  onSaveTemporary, 
  onHelp,
  hasProcessedImages = false 
}: HeaderProps) {
  return (
    <motion.header 
      className="border-b border-border bg-surface/95 backdrop-blur-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Camera className="h-7 w-7 text-primary" />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tighter text-text-primary">Image Processor</span>
              <span className="text-xs text-text-muted font-medium">Geometric Crop Engine</span>
            </div>
          </Link>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {hasProcessedImages && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onSaveTemporary}
                  className="hidden md:flex"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Temporal
                </Button>
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onDownloadAll}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Todo
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onHelp}
              className="text-text-muted hover:text-text-primary"
            >
              <HelpCircle className="h-5 w-5" />
              <span className="sr-only">Ayuda</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
