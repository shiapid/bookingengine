export const dynamic = "force-dynamic";

export function GET(): Response {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const release = process.env.SHIAP_RELEASE_SHA;

  if (release && /^[0-9a-f]{40}$/.test(release)) {
    headers.set("X-SHIAP-Release", release);
  }

  return Response.json(
    { status: "ok", service: "shiap-booking-engine" },
    { headers },
  );
}
