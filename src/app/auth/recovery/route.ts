import { NextResponse } from "next/server";
import { recoveryCodeCookie, recoveryCookies } from "@/lib/auth/cookies";
import { isRecoveryCode } from "@/lib/auth/validation";

export function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const valid = isRecoveryCode(code);
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: valid ? "/reset-password" : "/reset-password?status=invalid",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });

  // Exchange the code only when the user submits a new password.
  if (valid) response.cookies.set(recoveryCodeCookie, code, recoveryCookies);
  return response;
}
