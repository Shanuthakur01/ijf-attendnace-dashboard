import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  
  // To clear the cookie, set it with an expired date
  res.cookies.set({
    name: "auth_token",
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return res;
}
