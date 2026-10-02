const secure = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];
const noStore = [{ key: "Cache-Control", value: "no-store" }];

export default {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["argon2", "pdfkit"],
  async headers() {
    return [
      { source: "/:path*", headers: secure },
      { source: "/", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/api/:path*", headers: noStore },
    ];
  },
};
