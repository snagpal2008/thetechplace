import { current } from "@/lib/current";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Profile" };

export default async function Profile() {
  const { org } = await current("director");
  return (
    <>
      <PageHeader title="Business profile" />
      <ProfileForm org={org} />
    </>
  );
}
