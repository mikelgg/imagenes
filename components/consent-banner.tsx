'use client'

import { useState } from 'react'
import { Shield, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'

interface ConsentBannerProps {
  onConsentChange: (consent: boolean) => void
  onDismiss: () => void
}

export function ConsentBanner({ onConsentChange, onDismiss }: ConsentBannerProps) {
  const [consent, setConsent] = useState(false)

  const handleConsentChange = (checked: boolean) => {
    setConsent(checked)
    onConsentChange(checked)
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Shield className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
          
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Privacy & Data Notice
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This tool processes your images <strong>entirely in your browser</strong>. 
                Your images are never uploaded to our servers by default. However, with your 
                explicit consent, we can temporarily store <strong>one sample image</strong> from 
                each processing batch for 24 hours to help us improve our service and ensure 
                quality. This data is automatically deleted after 24 hours and contains no 
                personal information.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-checkbox"
                checked={consent}
                onCheckedChange={handleConsentChange}
              />
              <label 
                htmlFor="consent-checkbox" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I consent to temporary storage of one sample image for 24 hours for service improvement
              </label>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                ✓ Processing happens in your browser<br/>
                ✓ No personal data collected<br/>
                ✓ Optional sample storage with consent<br/>
                ✓ Automatic deletion after 24 hours<br/>
                ✓ You can process images without consent
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-8 w-8 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
