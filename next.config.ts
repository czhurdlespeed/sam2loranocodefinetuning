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
            value: "camera=(self), microphone=(self), geolocation=()",
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

              // LiveKit agent embed script + frames (must match LIVEKIT_EMBED_ORIGIN used by /api/embed-script)
              const liveKitEmbedOrigin =
                process.env.LIVEKIT_EMBED_ORIGIN ||
                "https://agent-starter-embed-git-preview-calvin-wetzels-projects.vercel.app";

              // R2 bucket for agent intro video
              const r2MediaOrigin =
                "https://pub-607355d54eab447aaf8548522b8bdf61.r2.dev";

              // Base CSP directives (include LiveKit embed in script-src and frame-src)
              const directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' " + liveKitEmbedOrigin,
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "font-src 'self' data:",
                "connect-src 'self' https: wss:",
                "media-src 'self' " + r2MediaOrigin,
                "frame-ancestors 'none'",
                "frame-src 'self' " + liveKitEmbedOrigin,
                "base-uri 'self'",
                "form-action 'self'",
              ];

              // Allow Vercel Live feedback script and frames in preview environments
              if (isPreview) {
                directives[1] =
                  "script-src 'self' 'unsafe-inline' https://vercel.live " +
                  liveKitEmbedOrigin;
                directives[7] =
                  "frame-src 'self' https://vercel.live " + liveKitEmbedOrigin;
              }

              // Development: allow eval (React dev bundles) and localhost connections
              if (isDev) {
                directives[1] =
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
                  liveKitEmbedOrigin;
                directives[5] =
                  "connect-src 'self' https: wss: http://localhost:* ws://localhost:* ws://127.0.0.1:*";
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
