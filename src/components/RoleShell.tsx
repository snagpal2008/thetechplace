import { AppShell } from "./AppShell";
import { current } from "@/lib/current";

export async function RoleShell({ children }: { children: React.ReactNode }) {
  const { session, org } = await current();
  return <AppShell session={session} orgName={org?.name ?? ""}>{children}</AppShell>;
}
