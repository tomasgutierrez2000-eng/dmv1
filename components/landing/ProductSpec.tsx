'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const specs = [
  { label: 'PROTEIN', value: '16G' },
  { label: 'CARBS', value: '0G' },
  { label: 'FAT', value: '2G' },
  { label: 'CALORIES', value: '80' },
  { label: 'SERVING SIZE', value: '1 PACKET' },
]

export default function ProductSpec() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="specs" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20 bg-matte-black" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Spec Sheet */}
          <motion.div
            className="border border-[0.5px] border-aerospace-silver/20 bg-matte-black/30 backdrop-blur-sm p-8 lg:p-12"
            initial={{ opacity: 0.5, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0.5, x: -30 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-space-mono text-2xl uppercase tracking-wider text-aerospace-silver mb-8">
              TECHNICAL SPECIFICATIONS
            </h2>
            <div className="space-y-4 font-space-mono text-sm">
              {specs.map((spec, index) => (
                <motion.div
                  key={index}
                  className="flex justify-between items-center border-b border-[0.5px] border-aerospace-silver/10 pb-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                >
                  <span className="text-aerospace-silver/70 uppercase tracking-wider">
                    {spec.label}
                  </span>
                  <span className="text-aerospace-silver font-bold">
                    {spec.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Product Image Placeholder */}
          <motion.div
            className="border border-[0.5px] border-aerospace-silver/20 bg-matte-black/30 backdrop-blur-sm aspect-square flex items-center justify-center"
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="text-aerospace-silver/20 text-xs font-space-mono uppercase tracking-widest">
              PRODUCT IMAGE
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
