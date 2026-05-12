"use client"

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center bg-black text-center">
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-400">{error.message}</p>
        <button
          onClick={() => unstable_retry()}
          className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90"
        >
          Try again
        </button>
      </body>
    </html>
  )
}
