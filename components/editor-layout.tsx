'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EditorLayoutProps {
  toolbarPanel: React.ReactNode
  previewPanel: React.ReactNode
  uploadPanel?: React.ReactNode
  className?: string
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
}

const fadeUpItem = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0
  }
}

export function EditorLayout({ 
  toolbarPanel, 
  previewPanel, 
  uploadPanel, 
  className 
}: EditorLayoutProps) {
  return (
    <motion.div 
      className={cn("max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="space-y-6">
        {/* Upload Panel (if provided) */}
        {uploadPanel && (
          <motion.div 
            variants={fadeUpItem}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {uploadPanel}
          </motion.div>
        )}

        {/* Toolbar Panel - Controls at top */}
        <motion.div 
          variants={fadeUpItem}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {toolbarPanel}
        </motion.div>

        {/* Preview Panel - Below controls */}
        <motion.div 
          variants={fadeUpItem}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {previewPanel}
        </motion.div>
      </div>
    </motion.div>
  )
}
