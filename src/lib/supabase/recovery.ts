import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { recoveryCookies, recoveryVerifier } from "@/lib/auth/cookies";
import { getSupabaseConfig } from "./env";

const namespace = "shiap-recovery";

export async function createRecoveryClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();

  return createServerClient(url, publishableKey, {
    cookieOptions: { ...recoveryCookies, name: namespace },
    cookies: {
      getAll: () => cookieStore.getAll().filter(({ name }) => recoveryVerifier.test(name)),
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          // Recovery sessions stay in this client's request-local storage.
          if (recoveryVerifier.test(name)) {
            cookieStore.set(name, value, { ...options, maxAge: options.maxAge === 0 ? 0 : 3600 });
          }
        }
      },
    },
  });
}
