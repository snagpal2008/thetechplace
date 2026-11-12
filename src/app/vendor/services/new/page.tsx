import { PageHeader } from "@/components/ui";
import { ServiceForm } from "@/components/ServiceForm";

export const metadata = { title: "Add service" };

export default function NewService() {
  return (
    <>
      <PageHeader eyebrow="Rate card" title="Add a service" />
      <ServiceForm />
    </>
  );
}
