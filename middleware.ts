import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  // If no secret is configured, fallback to insecure mode or deny (using super_secret_key_for_ijf_secure_dashboard_2026 as default from env)
  const secret = process.env.JWT_SECRET || "super_secret_key_for_ijf_secure_dashboard_2026";
  const jwtSecret = new TextEncoder().encode(secret);

  const token = req.cookies.get("auth_token")?.value;

  // Paths that explicitly don't require auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  if (!token) {
    if (isAuthPage || isAuthApi) {
      return NextResponse.next();
    }
    // Redirect unauthenticated requests to /login
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify Token
    await jwtVerify(token, jwtSecret);
    
    // If they have a valid token but are trying to hit /login, redirect to dashboard
    if (isAuthPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  } catch (err) {
    // Invalid/expired token
    if (isAuthPage || isAuthApi) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", req.url);
    // Erase the bad token cookie before redirecting
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete("auth_token");
    return res;
  }
}

// Ensure middleware exclusively triggers on application paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (if any)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
