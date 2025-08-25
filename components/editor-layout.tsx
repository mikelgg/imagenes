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
      className={cn("max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Upload Panel - Full width when no files selected */}
      {uploadPanel && (
        <motion.div 
          variants={fadeUpItem}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mb-6"
        >
          {uploadPanel}
        </motion.div>
      )}

      {/* When files are selected: Desktop layout side-by-side, Mobile stacked */}
      {toolbarPanel && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Toolbar Panel - Controls on left (or top on mobile) */}
          <motion.div 
            variants={fadeUpItem}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="xl:col-span-2 space-y-4"
          >
            {toolbarPanel}
          </motion.div>

          {/* Preview Panel - On right (or bottom on mobile) */}
          <motion.div 
            variants={fadeUpItem}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="xl:col-span-3"
          >
            {previewPanel}
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
