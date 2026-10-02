import { NextResponse, type NextRequest } from "next/server";

const production = process.env.NODE_ENV === "production";
const SESSION_COOKIE = production ? "__Host-session" : "session";

export function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;
    const protectedPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
    const protectedApi = pathname.startsWith("/api/admin");

    if ((protectedPage || protectedApi) && !req.cookies.has(SESSION_COOKIE)) {
      if (protectedApi) return NextResponse.json({ success: false, message: "Não autorizado." }, { status: 401 });
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }

    const nonce = (() => {
      try {
        return btoa(crypto.randomUUID());
      } catch {
        return "fallback-nonce";
      }
    })();

    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${production ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(production ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    const headers = new Headers(req.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  } catch (error) {
    console.error("middleware failed:", error);
    return NextResponse.next();
  }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
