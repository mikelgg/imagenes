import Link from 'next/link'
import { motion } from 'framer-motion'
import { Cpu, Shield, Zap, Globe } from 'lucide-react'

export function Footer() {
  const features = [
    { icon: Cpu, text: 'Geometric Crop Algorithm' },
    { icon: Zap, text: 'Web Worker Performance' },
    { icon: Shield, text: 'Browser-Only Processing' },
    { icon: Globe, text: 'Universal Format Support' }
  ]

  return (
    <motion.footer 
      className="border-t border-border bg-surface/50 backdrop-blur-sm mt-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold mb-4 text-text-primary tracking-tight">About</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Advanced image processor with geometric deterministic cropping. 
              Zero borders guaranteed, privacy-first design.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4 text-text-primary tracking-tight">Legal</h3>
            <div className="space-y-3 text-sm">
              <Link 
                href="/terms" 
                className="block text-text-muted hover:text-text-primary transition-colors duration-200"
              >
                Terms & Conditions
              </Link>
              <Link 
                href="/privacy" 
                className="block text-text-muted hover:text-text-primary transition-colors duration-200"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-4 text-text-primary tracking-tight">Technology</h3>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <motion.li 
                  key={index}
                  className="flex items-center gap-2 text-sm text-text-muted"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <feature.icon className="h-4 w-4 text-primary" />
                  {feature.text}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <motion.div 
          className="mt-12 pt-8 border-t border-border text-center text-sm text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        >
          <p>&copy; 2024 Image Batch Processor. Geometric Crop Engine.</p>
        </motion.div>
      </div>
    </motion.footer>
  )
}
