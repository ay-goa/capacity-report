/* ── Capacity reports overview: mock facilities ───────────────────────── */
/* Only rows with a `flow` are clickable (per Figma 01-Home spec):
   - row 2 (Edmonton General Continuing Care Centre) -> "A" (inline accordion drawer)
   - row 3 (St. Joseph's Auxiliary Hospital)          -> "B" (multi-step wizard drawer)
   All other rows are static text, not links.                              */

export const facilities = [
  {
    id: 1,
    name: "Grey Nuns Community Hospital",
    dueDate: "July 6, 2026",
    submittedDate: null,
    status: "In progress",
    reporter: "-",
    flow: null,
  },
  {
    id: 2,
    name: "Edmonton General Continuing Care Centre",
    dueDate: "July 6, 2026",
    submittedDate: null,
    status: "Not started",
    reporter: "-",
    flow: "A",
  },
  {
    id: 3,
    name: "St. Joseph's Auxiliary Hospital",
    dueDate: "July 6, 2026",
    submittedDate: null,
    status: "Not started",
    reporter: "-",
    flow: "B",
  },
  {
    id: 4,
    name: "St. Michael's Health Centre",
    dueDate: "July 6, 2026",
    submittedDate: null,
    status: "Not started",
    reporter: "-",
    flow: null,
  },
  {
    id: 5,
    name: "Youville Home",
    dueDate: "July 6, 2026",
    submittedDate: null,
    status: "Not started",
    reporter: "-",
    flow: null,
  },
  {
    id: 6,
    name: "Extendicare Fort Macleod",
    dueDate: "July 6, 2026",
    submittedDate: "July 2, 2026",
    status: "Completed",
    reporter: "Jamie Chen",
    flow: null,
  },
  {
    id: 7,
    name: "Extendicare Leduc",
    dueDate: "July 6, 2026",
    submittedDate: "July 2, 2026",
    status: "Completed",
    reporter: "Jamie Chen",
    flow: null,
  },
  {
    id: 8,
    name: "Good Samaritan Society – Southgate Care Centre",
    dueDate: "July 6, 2026",
    submittedDate: "July 2, 2026",
    status: "Completed",
    reporter: "Jamie Chen",
    flow: null,
  },
  {
    id: 9,
    name: "Intercare Corporate Group Inc.",
    dueDate: "July 6, 2026",
    submittedDate: "July 2, 2026",
    status: "Completed",
    reporter: "Jamie Chen",
    flow: null,
  },
  {
    id: 10,
    name: "Misericordia Community Hospital",
    dueDate: "July 6, 2026",
    submittedDate: "July 2, 2026",
    status: "Completed",
    reporter: "Jamie Chen",
    flow: null,
  },
];

/* ── Drawer report metadata (shared by both flows) ────────────────────── */

export const reportMeta = {
  reportingWeek: "April 24–April 30, 2026",
  reportDue: "May 1, 2026",
  completedOn: "September 22, 2025",
  reporter: "John Smith",
};

export const totalFundedBeds = 138 + 53 + 7 + 21; // 219

/* ── Bed types + reasons breakdown fields ─────────────────────────────── */
/* Both flows (Option A's inline accordion and Option B's wizard steps) now
   share the same flat "reasons" field set — per the updated Figma screens,
   the content is no longer split into unavailable/vacant sections.
   Only Type A has seeded `lastWeek` values in the source designs; they add
   up to its funded-bed count (130 + 2 + 3 + 3 = 138). Everything else,
   and every field for the other three types, starts blank.               */

const reasonDefs = [
  { key: "residentTransition", label: "Resident transition or discharge and room is ready for incoming admission", sublabel: "e.g. passed away, moved to another facility, internal move" },
  { key: "roomNotReady", label: "Room not yet ready for occupancy", sublabel: "e.g. family removing belongings, furniture removal, room cleaning" },
  { key: "referralInProgress", label: "Referral or admission in progress", sublabel: "e.g. reviewing match, awaiting information or family acceptance" },
  { key: "profileMismatch", label: "Client profile does not match the current vacancy", sublabel: "e.g. complex care needs, roommate/gender match, couple suite" },
  { key: "spaceMismatch", label: "Physical space does not meet the client's needs", sublabel: "e.g. mobility access, equipment needs, narrow doorways or hallways" },
  { key: "declinedOffer", label: "Client/family declined offer or chose another facility", sublabel: "e.g. preferred location became available" },
  { key: "noReferrals", label: "No packages or client profile referrals received", sublabel: "e.g. no waitlist in less preferred or rural locations" },
  { key: "operationalBarrier", label: "Space temporarily unavailable due to an operational barrier", sublabel: "e.g. insufficient staffing, no doctor on site, outbreak, flood or major renovations" },
  { key: "none", label: "None of the above", sublabel: "" },
];

function makeReasonItems(lastWeekByKey = {}) {
  return reasonDefs.map((def) => ({ ...def, lastWeek: lastWeekByKey[def.key] ?? null, thisWeek: "" }));
}

export const bedTypes = [
  {
    id: "typeA",
    label: "Type A",
    fundedBeds: 138,
    subtitle: "Formerly Long Term Care",
    description: "24/7 RN/RPN care for complex health needs not manageable at home.",
    items: makeReasonItems({ residentTransition: 130, referralInProgress: 2, declinedOffer: 3, operationalBarrier: 3 }),
  },
  {
    id: "typeB",
    label: "Type B",
    fundedBeds: 53,
    subtitle: "Formerly Designated Supportive Living",
    description: "Home-like setting with 24/7 LPN and HCA care.",
    items: makeReasonItems(),
  },
  {
    id: "typeBSecure",
    label: "Type B-Secure",
    fundedBeds: 7,
    subtitle: "Formerly Designated Supportive Living 4-D",
    description: "Type B with added security features for safety.",
    items: makeReasonItems(),
  },
  {
    id: "typeC",
    label: "Type C",
    fundedBeds: 21,
    subtitle: "Formerly Palliative and End-of-Life Care",
    description: "24/7 specialized care for individuals nearing end-of-life.",
    items: makeReasonItems(),
  },
];
