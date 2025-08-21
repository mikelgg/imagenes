'use client'

import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PanelProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  className?: string
  animate?: boolean
  delay?: number
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ children, className, animate = true, delay = 0, ...props }, ref) => {
    const motionProps = animate ? {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { 
        duration: 0.28, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] 
      }
    } : {}

    return (
      <motion.div
        ref={ref}
        className={cn(
          "bg-surface border border-border rounded-2xl p-6 shadow-surface",
          className
        )}
        {...motionProps}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Panel.displayName = 'Panel'

export { Panel }
