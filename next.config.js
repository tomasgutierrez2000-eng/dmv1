/** @type {import('next').NextConfig} */
const nextConfig = {
  // sql.js uses CJS + WASM — must be loaded natively, not bundled by webpack
  serverExternalPackages: ['sql.js'],
  // Include data files read via fs.readFileSync so Vercel bundles them
  outputFileTracingIncludes: {
    '/*': [
      './data/**/*.json',
      './data/**/*.xlsx',
      './facility-summary-mvp/output/data-dictionary/**/*.json',
      './scripts/l1/output/*.json',
      './scripts/l2/output/*.json',
    ],
  },
  // Expose env to server (helps when .env isn't loaded at startup)
  env: {
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    AGENT_PROVIDER: process.env.AGENT_PROVIDER,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
}

module.exports = nextConfig
