'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Lock } from 'lucide-react'

const protocols = [
  { label: 'CLASSIFIED', description: 'PROTOCOL: CLASSIFIED' },
  { label: 'IN R&D', description: 'PROTOCOL: IN DEVELOPMENT' },
]

export default function FutureProtocols() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.h2
          className="font-space-mono text-2xl uppercase tracking-wider text-aerospace-silver mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          FUTURE PROTOCOLS
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {protocols.map((protocol, index) => (
            <motion.div
              key={index}
              className="relative border border-[0.5px] border-aerospace-silver/20 bg-matte-black/30 backdrop-blur-sm p-8 overflow-hidden"
              initial={{ opacity: 0.5, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              {/* Blur overlay */}
              <div className="absolute inset-0 backdrop-blur-md bg-matte-black/40" />
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center min-h-[200px]">
                <Lock className="w-8 h-8 text-aerospace-silver/30 mb-4" />
                <h3 className="font-space-mono text-lg uppercase tracking-wider text-aerospace-silver/50 mb-2">
                  {protocol.label}
                </h3>
                <p className="font-inter text-xs text-aerospace-silver/30 uppercase tracking-wider">
                  {protocol.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
