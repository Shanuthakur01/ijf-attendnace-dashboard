import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const expectedPassword = process.env.DASHBOARD_PASSWORD || "ijf2026";
    
    if (password !== expectedPassword) {
      return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET || "super_secret_key_for_ijf_secure_dashboard_2026";
    const jwtSecret = new TextEncoder().encode(secret);

    // Create a JWT that expires in 7 days
    const token = await new SignJWT({ authorized: true })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(jwtSecret);

    const res = NextResponse.json({ success: true });
    
    // Set HTTP-only cookie
    res.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return res;
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
