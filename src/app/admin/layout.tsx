import { AppShell } from "@/components/AppShell";
import { current } from "@/lib/current";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { session, org } = await current("admin");
  return <AppShell session={session} orgName={org?.name ?? ""}>{children}</AppShell>;
}
