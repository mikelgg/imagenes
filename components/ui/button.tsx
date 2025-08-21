import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:pointer-events-none disabled:opacity-50 tracking-tight",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-emerald-400 via-cyan-400 to-violet-500 text-white shadow-glow hover:shadow-glow-sm hover:ring-1 hover:ring-cyan-400/30 relative overflow-hidden",
        secondary:
          "bg-surface border border-border text-text-primary hover:bg-muted hover:border-text-muted/20 shadow-surface",
        ghost: 
          "text-text-primary hover:bg-surface hover:text-text-primary",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent text-text-primary hover:bg-surface hover:text-text-primary",
      },
      size: {
        default: "h-11 px-5 py-3",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-12 px-6 py-3 text-base",
        xl: "h-14 px-8 py-4 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : motion.button
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        whileHover={{ 
          y: -1, 
          scale: 1.02,
          transition: { duration: 0.15, ease: "easeOut" }
        }}
        whileTap={{ 
          y: 1, 
          scale: 0.98,
          transition: { duration: 0.1, ease: "easeInOut" }
        }}
        ref={ref}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <motion.div
            className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
