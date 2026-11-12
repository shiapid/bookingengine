export const sessionCookies = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const recoveryCodeCookie = "shiap-recovery-code";
export const recoveryCookies = { ...sessionCookies, path: "/reset-password", maxAge: 300 };
export const recoveryVerifier = /^shiap-recovery-.*code-verifier(?:\.\d+)?$/;
