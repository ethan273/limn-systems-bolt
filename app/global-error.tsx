'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">500</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Server Error</h2>
        <p className="text-gray-500 text-sm mb-4">
          An unexpected server error occurred.
        </p>
        <button
          onClick={reset}
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}