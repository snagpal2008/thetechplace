import type { OrderStatus, VendorCategory } from "@/db/schema";

export const CATEGORY_LABELS: Record<VendorCategory, string> = {
  florist: "Florist",
  coffins_caskets: "Coffins & caskets",
  transport_limousine: "Limousines & transport",
  hearse_ambulance: "Hearse & private ambulance",
  embalming_presentation: "Embalming & presentation",
  celebrant_music: "Celebrants & music",
  catering: "Catering",
  printing_stationery: "Printing & stationery",
  crematorium: "Crematorium",
  cemetery_monuments: "Cemetery & monuments",
  other: "Other services",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  declined: "Declined",
  in_progress: "In progress",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const VAT_RATES = [
  { bps: 2300, label: "23% (standard)" },
  { bps: 1350, label: "13.5% (reduced)" },
  { bps: 900, label: "9% (second reduced)" },
  { bps: 0, label: "0% / exempt" },
];
