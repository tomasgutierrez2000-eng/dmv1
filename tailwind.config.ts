import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* PwC brand */
        'pwc-orange': '#D04A02',
        'pwc-orange-light': '#E87722',
        'pwc-black': '#000000',
        'pwc-gray': '#2D2D2D',
        'pwc-gray-light': '#6E6E6E',
        'pwc-white': '#FFFFFF',
        /* Legacy aliases mapped to PwC */
        'matte-black': '#000000',
        'aerospace-silver': '#B3B3B3',
        'safety-orange': '#D04A02',
      },
      fontFamily: {
        'space-mono': ['var(--font-space-mono)', 'monospace'],
        'inter': ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
