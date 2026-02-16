'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 bg-matte-black">
      {/* Floating Product Animation */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 border border-[0.5px] border-aerospace-silver/30 bg-matte-black/50 backdrop-blur-sm"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 2, -2, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-full h-full flex items-center justify-center border border-[0.5px] border-aerospace-silver/20 m-2">
            <div className="text-aerospace-silver/20 text-xs font-space-mono uppercase tracking-widest">
              BANK DATA
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Content */}
      <div className="relative z-20 text-center max-w-4xl mx-auto">
        <motion.h1
          className="font-space-mono text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight mb-6 text-aerospace-silver"
          initial={{ opacity: 0.2, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Bank Data Model Visualizer
        </motion.h1>
        
        <motion.p
          className="font-inter text-sm sm:text-base md:text-lg text-aerospace-silver/70 mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Explore L1/L2/L3 banking and financial services data schema, counterparties, facilities, and credit data.
        </motion.p>

        <motion.a
          href="/visualizer"
          className="group relative px-8 py-4 bg-aerospace-silver text-matte-black font-space-mono uppercase text-sm tracking-widest border border-[0.5px] border-aerospace-silver hover:scale-105 transition-transform duration-300 flex items-center gap-2 mx-auto w-fit cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          Open Visualizer
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.a>
      </div>
    </section>
  )
}
