import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-pwc-black text-pwc-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-pwc-orange mb-2">404</h1>
        <p className="text-xl text-pwc-gray-light mb-8">This page could not be found.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-pwc-orange hover:bg-pwc-orange-light rounded-lg font-medium transition-colors"
          >
            Home
          </Link>
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-pwc-gray-light hover:border-pwc-orange rounded-lg font-medium transition-colors"
          >
            Visualizer
          </Link>
        </div>
        <p className="text-sm text-pwc-gray-light mt-8">
          Run the app from the <code className="bg-pwc-gray px-1 rounded">120</code> folder and use the port shown in the terminal (e.g. 3000 or 8765).
        </p>
      </div>
    </div>
  );
}
