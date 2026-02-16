'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const nutrients = [
  { title: 'Type 1 Collagen', description: 'Marine-sourced, hydrolyzed' },
  { title: 'Zero Seed Oils', description: 'Clean lipid profile' },
  { title: 'Wild Caught', description: 'Sustainable sourcing' },
]

export default function NutrientGrid() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="briefing" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20 bg-matte-black" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {nutrients.map((nutrient, index) => (
            <motion.div
              key={index}
              className="border border-[0.5px] border-aerospace-silver/20 bg-matte-black/30 backdrop-blur-sm p-8 hover:border-aerospace-silver/40 transition-colors"
              initial={{ opacity: 0.5, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <h3 className="font-space-mono text-lg uppercase tracking-wider text-aerospace-silver mb-3">
                {nutrient.title}
              </h3>
              <p className="font-inter text-sm text-aerospace-silver/60">
                {nutrient.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
