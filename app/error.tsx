'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Oops!</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-4">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        
        <div className="space-y-4">
          <button
            onClick={reset}
            className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors mr-4"
          >
            Try Again
          </button>
          <Link 
            href="/dashboard" 
            className="inline-block bg-gray-200 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}