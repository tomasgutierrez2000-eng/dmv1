/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose env to server (helps when .env isn't loaded at startup)
  env: {
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
}

module.exports = nextConfig
