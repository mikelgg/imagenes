'use client'

import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'

interface ProcessingProgressProps {
  current: number
  total: number
}

export function ProcessingProgress({ current, total }: ProcessingProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="font-medium">Processing Images...</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{current} of {total} completed</span>
        </div>
        <Progress value={percentage} className="w-full" />
      </div>

      <div className="text-sm text-muted-foreground">
        {current < total ? (
          <>Processing image {current + 1} of {total}...</>
        ) : (
          'Processing complete!'
        )}
      </div>
    </div>
  )
}
