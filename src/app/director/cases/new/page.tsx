import { createCaseAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "New case" };

export default function NewCase() {
  return (
    <>
      <PageHeader eyebrow="Funeral cases" title="Open a new case" />
      <ActionForm action={createCaseAction} className="card max-w-2xl space-y-5 p-6">
        <div>
          <label className="label" htmlFor="deceasedName">Name of the deceased</label>
          <input id="deceasedName" name="deceasedName" required className="input" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="funeralDate">Funeral date & time</label>
            <input id="funeralDate" name="funeralDate" type="datetime-local" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="familyContact">Family contact</label>
            <input id="familyContact" name="familyContact" className="input" placeholder="Name & phone of next of kin" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="location">Church / venue</label>
          <input id="location" name="location" className="input" placeholder="e.g. St Mary's Church, Clondalkin" />
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes for your team</label>
          <textarea id="notes" name="notes" rows={3} className="input" />
        </div>
        <Submit>Create case</Submit>
      </ActionForm>
    </>
  );
}
