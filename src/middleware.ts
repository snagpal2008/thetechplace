import { NextResponse, type NextRequest } from "next/server";
import { homeFor, SESSION_COOKIE, verifySession } from "@/lib/auth-token";

const PROTECTED = ["/director", "/vendor", "/admin", "/orders", "/invoices"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const area = pathname.split("/")[1];
    if ((area === "director" || area === "vendor" || area === "admin") && area !== session.role) {
      return NextResponse.redirect(new URL(homeFor(session.role), req.url));
    }
  }
  if ((pathname === "/login" || pathname === "/register") && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/director/:path*", "/vendor/:path*", "/admin/:path*", "/orders/:path*", "/invoices/:path*", "/login", "/register"],
};
