'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccordionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  className?: string
}

export function Accordion({ 
  title, 
  children, 
  defaultOpen = false, 
  disabled = false,
  icon,
  className 
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className={cn("border border-border rounded-xl bg-surface", className)}>
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left transition-colors",
          "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30",
          disabled && "cursor-not-allowed opacity-50"
        )}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-primary">{icon}</span>}
          <span className="font-medium text-text-primary">{title}</span>
        </div>
        {!disabled && (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </motion.div>
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={`accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-border/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
