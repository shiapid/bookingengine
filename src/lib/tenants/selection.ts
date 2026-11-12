export type Tenant = { id: string; name: string; role: "admin" | "member" };

export function selectTenant(tenants: Tenant[], requested: string | string[] | undefined) {
  if (requested !== undefined) {
    const tenant = tenants.find(({ id }) => id === requested);
    return tenant ? { status: "selected" as const, tenant } : { status: "denied" as const };
  }
  const tenant = tenants[0];
  return tenant ? { status: "selected" as const, tenant } : { status: "empty" as const };
}
