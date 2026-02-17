'use client';

import Link from 'next/link';
import { FileUp, LayoutDashboard, Network } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br bg-pwc-black text-pwc-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-pwc-gray border border-pwc-gray-light flex items-center justify-center mx-auto mb-6">
          <FileUp className="w-8 h-8 text-pwc-gray-light" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Upload Excel</h1>
        <p className="text-pwc-gray-light mb-8">
          This feature is temporarily disabled. It will be re-enabled when you make changes to your current tables.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/overview"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-pwc-gray hover:bg-pwc-gray-light rounded-lg text-sm font-medium transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </Link>
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-pwc-orange hover:bg-pwc-orange-light rounded-lg text-sm font-medium transition-colors"
          >
            <Network className="w-4 h-4" />
            Interactive Visualizer
          </Link>
        </div>
      </div>
    </div>
  );
}
