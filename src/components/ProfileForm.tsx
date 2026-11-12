import type { Organization } from "@/db/schema";
import { saveProfileAction } from "@/app/actions";
import { ActionForm, Submit } from "./forms";

export function ProfileForm({ org }: { org: Organization }) {
  return (
    <ActionForm action={saveProfileAction} className="card max-w-2xl space-y-5 p-6">
      <div>
        <label className="label" htmlFor="name">Business name</label>
        <input id="name" name="name" defaultValue={org.name} required className="input" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" defaultValue={org.phone ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="vatNumber">VAT number</label>
          <input id="vatNumber" name="vatNumber" defaultValue={org.vatNumber ?? ""} className="input" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="address">Address</label>
          <input id="address" name="address" defaultValue={org.address ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="county">County</label>
          <input id="county" name="county" defaultValue={org.county ?? ""} className="input" />
        </div>
      </div>
      {org.type === "vendor" && (
        <div>
          <label className="label" htmlFor="description">About your business (shown to funeral directors)</label>
          <textarea id="description" name="description" rows={4} defaultValue={org.description ?? ""} className="input" />
        </div>
      )}
      <Submit>Save profile</Submit>
    </ActionForm>
  );
}
