import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Security headers
  async headers() {
    return [
      {
        // Security headers for all routes
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: (() => {
              const isDev = process.env.NODE_ENV === "development";
              const isPreview = process.env.VERCEL_ENV === "preview";

              // Base CSP directives
              const directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "font-src 'self' data:",
                "connect-src 'self' https:",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'",
              ];

              // Allow Vercel Live feedback script in preview environments
              if (isPreview) {
                directives[1] = "script-src 'self' 'unsafe-inline' https://vercel.live";
              }

              // Allow localhost connections in development
              if (isDev) {
                directives[5] = "connect-src 'self' https: http://localhost:* ws://localhost:* ws://127.0.0.1:*";
              }

              return directives.join("; ");
            })(),
          },
        ],
      },
      {
        // Cache static assets (images, fonts, etc.)
        source: "/:path*\\.(jpg|jpeg|png|gif|svg|ico|webp|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache Next.js static files
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Don't cache API routes (especially auth)
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
    ];
  },
  // Redirect HTTP to HTTPS in production
  ...(process.env.NODE_ENV === "production" && {
    async redirects() {
      return [
        {
          source: "/:path*",
          has: [
            {
              type: "header",
              key: "x-forwarded-proto",
              value: "http",
            },
          ],
          destination: "https://:path*",
          permanent: true,
        },
      ];
    },
  }),
};

export default nextConfig;
