export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(
    { status: "ok", service: "shiap-booking-engine" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
