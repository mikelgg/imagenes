import Link from 'next/link'
import { ArrowLeft, Shield, Clock, Trash2 } from 'lucide-react'

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-primary mb-2">Privacy-First Approach</h3>
              <p className="text-sm">
                Our service is designed with privacy as the foundation. By default, all image 
                processing happens entirely in your web browser, and no data is sent to our servers.
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. Data Processing</h2>
          <h3 className="text-xl font-medium">1.1 Client-Side Processing</h3>
          <p>
            All image processing (rotation, cropping, resizing, format conversion) occurs entirely 
            within your web browser using modern Web APIs. Your images never leave your device 
            during the processing workflow.
          </p>
          
          <h3 className="text-xl font-medium">1.2 Minimal Data Collection</h3>
          <p>
            We automatically collect minimal data for service improvement:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>One sample image per batch (automatically deleted after 24h)</li>
            <li>No personal identifying information</li>
            <li>No IP addresses stored</li>
            <li>No device information beyond basic web analytics</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Automatic Temporary Storage</h2>
          
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" />
              Automatic Temporary Storage
            </h3>
            <p className="text-sm">
              One sample image from each processing batch is automatically stored temporarily 
              for exactly 24 hours for service improvement purposes.
            </p>
          </div>

          <h3 className="text-xl font-medium">2.1 Purpose of Temporary Storage</h3>
          <p>Temporary storage is used exclusively for:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Service Quality:</strong> Identifying and fixing processing issues</li>
            <li><strong>Security:</strong> Monitoring for abuse or misuse of the service</li>
            <li><strong>Technical Improvement:</strong> Understanding common processing patterns</li>
          </ul>

          <h3 className="text-xl font-medium">2.2 What We Store</h3>
          <p>We automatically store:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>One processed image from your batch (typically the first successful result)</li>
            <li>A randomly generated batch ID (no personal information)</li>
            <li>Processing timestamp</li>
          </ul>

          <h3 className="text-xl font-medium">2.3 What We Do NOT Store</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Your IP address or location data</li>
            <li>Personal identifying information</li>
            <li>Original unprocessed images</li>
            <li>All images from your batch (only one sample)</li>
            <li>Processing settings or metadata</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Automatic Data Deletion</h2>
          
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-medium flex items-center gap-2 mb-2">
              <Trash2 className="h-4 w-4" />
              Guaranteed Deletion
            </h3>
            <p className="text-sm">
              All temporarily stored data is automatically and permanently deleted after exactly 
              24 hours through automated systems.
            </p>
          </div>

          <p>
            We implement multiple layers of automatic deletion:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>S3 Lifecycle Rules for automatic object expiration</li>
            <li>Application-level cleanup processes</li>
            <li>No manual intervention required for deletion</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Your Rights and Choices</h2>
          
          <h3 className="text-xl font-medium">4.1 Automatic Storage</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Storage is automatic and transparent</li>
            <li>No user action required for service improvement</li>
            <li>All data is automatically deleted within 24 hours</li>
          </ul>

          <h3 className="text-xl font-medium">4.2 Data Access</h3>
          <p>
            Since we don't collect personal information and all data is automatically deleted 
            within 24 hours, there is no permanent data to access or modify.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. Technical Safeguards</h2>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>All connections use HTTPS encryption</li>
            <li>Temporary storage uses secure cloud infrastructure</li>
            <li>No permanent data retention systems</li>
            <li>Regular security audits of infrastructure</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Third-Party Services</h2>
          <p>
            We use secure cloud storage services (AWS S3 or compatible) for automatic temporary 
            storage. These services are configured with automatic deletion and do not have 
            access to any personal information.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Children's Privacy</h2>
          <p>
            Our service does not collect personal information from users of any age. Since 
            processing occurs client-side by default, the service is safe for all users while 
            maintaining privacy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Changes to This Policy</h2>
          <p>
            We may update this privacy policy to reflect changes in our practices or for legal 
            reasons. We will notify users of significant changes through the application interface.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Contact Information</h2>
          <p>
            For questions about this privacy policy or our data practices, please contact us 
            through the support channels available in the application.
          </p>
        </section>

        <div className="pt-8 border-t">
          <p className="text-center text-muted-foreground">
            <Link href="/terms" className="hover:underline">Terms & Conditions</Link>
            {' • '}
            <Link href="/" className="hover:underline">Image Processor</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
