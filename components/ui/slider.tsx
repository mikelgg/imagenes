"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center group",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary to-accent-to rounded-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb 
      className="block h-5 w-5 rounded-full border-2 border-primary bg-surface shadow-glow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:shadow-glow disabled:pointer-events-none disabled:opacity-50 hover:scale-110 hover:shadow-glow group-hover:border-accent-to" 
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
