import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
          <p className="text-gray-500">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/dashboard" 
            className="inline-block bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </Link>
          <div>
            <Link 
              href="/" 
              className="text-primary hover:text-primary/80 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}