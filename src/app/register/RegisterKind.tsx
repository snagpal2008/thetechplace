"use client";

import { useState } from "react";
import { CATEGORY_LABELS } from "@/lib/labels";

export function RegisterKind({ initial }: { initial: "director" | "vendor" }) {
  const [kind, setKind] = useState(initial);
  return (
    <>
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-paper p-1">
        {(["director", "vendor"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${kind === k ? "bg-white shadow-sm" : "text-ink-mute"}`}
          >
            {k === "director" ? "Funeral director" : "Vendor"}
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="orgName">{kind === "director" ? "Funeral home name" : "Business name"}</label>
        <input id="orgName" name="orgName" required className="input" />
      </div>
      {kind === "vendor" && (
        <div>
          <label className="label" htmlFor="category">What do you supply?</label>
          <select id="category" name="category" required className="input" defaultValue="">
            <option value="" disabled>Choose a category</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-mute">Vendor accounts are reviewed before appearing in the marketplace.</p>
        </div>
      )}
    </>
  );
}
