'use client'

import Link from 'next/link'

export function FooterNote() {
  return (
    <footer className="mt-12 py-6 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <p className="text-xs text-text-muted/70 leading-relaxed">
          * Para mejorar el servicio se guardará temporalmente una sola imagen de cada lote durante 24 horas. 
          Borrado automático. Sin datos personales.{' '}
          <Link 
            href="/privacy" 
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            Ver Política de Privacidad
          </Link>
          .
        </p>
      </div>
    </footer>
  )
}
