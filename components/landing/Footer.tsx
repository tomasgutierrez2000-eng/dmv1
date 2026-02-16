const links = [
  { label: 'SPECS', href: '#specs' },
  { label: 'BRIEFING', href: '#briefing' },
  { label: 'CONTACT', href: '#contact' },
]

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-[0.5px] border-aerospace-silver/20 py-12 px-4 sm:px-6 lg:px-8 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-4 text-center">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="font-space-mono text-xs uppercase tracking-wider text-aerospace-silver/60 hover:text-aerospace-silver transition-colors border border-[0.5px] border-transparent hover:border-aerospace-silver/20 py-3"
            >
              {link.label}
            </a>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="font-space-mono text-xs uppercase tracking-wider text-aerospace-silver/40">
            Bank Data Model Visualizer
          </p>
        </div>
      </div>
    </footer>
  )
}
