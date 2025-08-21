'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface BatchProgressProps {
  current: number
  total: number
  currentFileName?: string
  status?: 'processing' | 'completed' | 'error'
  className?: string
}

export function BatchProgress({ 
  current, 
  total, 
  currentFileName,
  status = 'processing',
  className 
}: BatchProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0
  
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Clock className="h-5 w-5 text-primary" />
          </motion.div>
        )
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Procesamiento completado'
      case 'error':
        return 'Error en el procesamiento'
      default:
        return 'Procesando imágenes...'
    }
  }

  return (
    <motion.div 
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28 }}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-medium text-text-primary">{getStatusText()}</h3>
              {currentFileName && status === 'processing' && (
                <p className="text-sm text-text-muted">
                  Procesando: {currentFileName}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold text-text-primary">
              {current}/{total}
            </div>
            <div className="text-sm text-text-muted">
              {Math.round(percentage)}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={percentage} className="h-2" />
          
          {/* Time Estimation */}
          {status === 'processing' && current > 0 && (
            <motion.div 
              className="text-xs text-text-muted flex justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span>
                {current > 1 && `~${Math.round((total - current) * 2)}s restantes`}
              </span>
              <span>
                {current}/{total} completadas
              </span>
            </motion.div>
          )}
        </div>

        {/* Batch Stats */}
        {status === 'completed' && (
          <motion.div 
            className="grid grid-cols-3 gap-4 pt-4 border-t border-border"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-center">
              <div className="text-lg font-semibold text-green-500">{current}</div>
              <div className="text-xs text-text-muted">Exitosas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-text-primary">{total}</div>
              <div className="text-xs text-text-muted">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-primary">100%</div>
              <div className="text-xs text-text-muted">Completado</div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
