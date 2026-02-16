'use client'

import { motion } from 'framer-motion'

export default function StatusBar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-[0.5px] border-aerospace-silver/20 bg-matte-black/80 backdrop-blur-md px-6 py-3 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-safety-orange animate-pulse" />
        <span className="font-space-mono text-[10px] uppercase tracking-[0.2em] text-aerospace-silver/80">
          SYSTEM.STATUS: OPERATIONAL
        </span>
      </div>
      <div className="hidden md:block">
        <span className="font-space-mono text-[10px] uppercase tracking-[0.2em] text-aerospace-silver/40">
          COORDINATES: 34.0522° N, 118.2437° W
        </span>
      </div>
    </nav>
  )
}
