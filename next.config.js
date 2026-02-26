/** @type {import('next').NextConfig} */
const nextConfig = {
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
