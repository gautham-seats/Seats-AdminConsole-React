import type { NextConfig } from 'next'

const allowWrites = process.env.ADMIN_ALLOW_WRITES

// Inlined into the client bundle at build time, so an unset value would ship a permanent read-only app.
if (process.env.NODE_ENV === 'production' && allowWrites !== 'true' && allowWrites !== 'false') {
  throw new Error(
    "ADMIN_ALLOW_WRITES must be set explicitly to 'true' or 'false' for a production build. " +
      'The value is compiled into the client bundle, so setting it on the server after the build has no effect.',
  )
}

// Browser hardening the legacy host does not add for this path; same-origin framing keeps the app switcher working.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
]

const nextConfig: NextConfig = {
  basePath: '/admin-next',
  allowedDevOrigins: ['dev.seats.local'],
  devIndicators: false,
  env: {
    ADMIN_ALLOW_WRITES: allowWrites === 'true' ? 'true' : 'false',
  },
  headers: async () => [{ source: '/:path*', headers: securityHeaders }],
}

export default nextConfig
