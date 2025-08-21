'use client'

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface MotionButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn("", className)}
        disabled={disabled}
        whileHover={disabled ? {} : { 
          scale: 1.02, 
          y: -1,
          transition: { duration: 0.16, ease: "easeOut" }
        }}
        whileTap={disabled ? {} : { 
          scale: 0.98, 
          y: 1,
          transition: { duration: 0.16, ease: "easeInOut" }
        }}
        {...props}
      >
        {children}
      </motion.button>
    )
  }
)

MotionButton.displayName = "MotionButton"
