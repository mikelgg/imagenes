import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Image Processor
        </Link>
      </div>

      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Service Description</h2>
          <p>
            Image Batch Processor is a web-based application that allows users to process 
            images entirely within their browser. The service includes features such as rotation, 
            cropping, resizing, and format conversion.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Privacy-First Processing</h2>
          <p>
            By default, all image processing occurs entirely in your web browser. Your images 
            are not uploaded to our servers unless you explicitly provide consent for temporary 
            storage as described in our Privacy Policy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Optional Data Collection</h2>
          <p>
            With your explicit consent, we may temporarily store one sample image from your 
            processing batch for up to 24 hours. This data is used solely for:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Service quality improvement</li>
            <li>Security monitoring</li>
            <li>Technical issue diagnosis</li>
          </ul>
          <p>
            This storage is completely optional and the service functions fully without consent.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Only upload images you own or have permission to process</li>
            <li>Not upload illegal, harmful, or inappropriate content</li>
            <li>Respect intellectual property rights</li>
            <li>Use the service in compliance with applicable laws</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Service Limitations</h2>
          <p>
            The service is provided "as is" with the following limitations:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Maximum 20 images per batch</li>
            <li>Maximum 10MB per image file</li>
            <li>Supported formats: JPEG, PNG, WebP</li>
            <li>Processing occurs on client device capabilities</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Disclaimer</h2>
          <p>
            We provide this service free of charge and make no warranties about availability, 
            accuracy, or fitness for any particular purpose. Users are responsible for maintaining 
            backups of their original images.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Data Retention</h2>
          <p>
            Any temporarily stored images are automatically deleted after 24 hours through 
            automated systems. We do not maintain permanent copies of user images.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the 
            service constitutes acceptance of updated terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Contact</h2>
          <p>
            For questions about these terms, please contact us through the information 
            provided in our Privacy Policy.
          </p>
        </section>

        <div className="pt-8 border-t">
          <p className="text-center text-muted-foreground">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            {' • '}
            <Link href="/" className="hover:underline">Image Processor</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
