'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EditorLayoutProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  className?: string
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0
  }
}

export function EditorLayout({ leftPanel, rightPanel, className }: EditorLayoutProps) {
  return (
    <motion.div 
      className={cn("max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - Tools */}
        <motion.div 
          className="space-y-6"
          variants={fadeUpItem}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {leftPanel}
        </motion.div>

        {/* Right Panel - Preview */}
        <motion.div 
          className="space-y-6"
          variants={fadeUpItem}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {rightPanel}
        </motion.div>
      </div>
    </motion.div>
  )
}
