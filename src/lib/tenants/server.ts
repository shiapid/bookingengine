import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tenant } from "./selection";

export async function getMemberships(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("tenant_members")
    .select("role, tenant:tenants!inner(id, name)")
    .eq("user_id", userId)
    .order("tenant_id")
    .overrideTypes<{ role: Tenant["role"]; tenant: Pick<Tenant, "id" | "name"> }[], { merge: false }>();

  if (error) return null;
  return data.map(({ role, tenant }) => ({ ...tenant, role }));
}
