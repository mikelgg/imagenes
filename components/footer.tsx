import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold mb-3">About</h3>
            <p className="text-sm text-muted-foreground">
              Modern web-based image processor that works entirely in your browser. 
              Your privacy is our priority.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3">Legal</h3>
            <div className="space-y-2 text-sm">
              <Link 
                href="/terms" 
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms & Conditions
              </Link>
              <Link 
                href="/privacy" 
                className="block text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-3">Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Batch image processing</li>
              <li>• Automatic rotation & cropping</li>
              <li>• No data uploaded to servers</li>
              <li>• Modern web technology</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Image Batch Processor. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
