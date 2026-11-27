// Homepage sections patch. Run once from the project folder: node scripts/home-patch.mjs
import fs from "node:fs";

let failed = false;
function patch(file, edits) {
  let src = fs.readFileSync(file, "utf8");
  for (const [find, replace, label] of edits) {
    if (src.includes(replace)) { console.log(`= ${file}: ${label} (already done)`); continue; }
    const hits = src.split(find).length - 1;
    if (hits !== 1) { console.log(`✗ ${file}: ${label} — found ${hits} matches`); failed = true; continue; }
    src = src.replace(find, replace);
    console.log(`✓ ${file}: ${label}`);
  }
  fs.writeFileSync(file, src);
}

patch("src/lib/site.js", [[
  "  heroCredit:",
  `  // Ìlera Health is a portfolio project: these details are placeholders and say so on the page
  contact: {
    isDemo: true,
    address: ["Ring Road", "Ibadan, Oyo State"],
    phone: "0800 000 0000",
    email: "hello@ilera-health.example",
    hours: [
      ["Outpatient clinics", "Mon–Fri, 8am–4pm · Sat, 9am–2pm"],
      ["Laboratory & pharmacy", "Mon–Sat, 8am–6pm"],
      ["Emergency", "Open 24 hours, every day"],
    ],
  },
  heroCredit:`,
  "contact details",
]]);

patch("src/components/landing/AvatarStack.js", [["10K+ patients cared for", "Every department, one patient record", "honest tagline"]]);

patch("src/app/page.js", [
  ['import { SITE } from "@/lib/site";', 'import { SITE } from "@/lib/site";\nimport HomeSections from "@/components/landing/HomeSections";', "import"],
  ["      </section>\n    </main>", "      </section>\n\n      <HomeSections />\n    </main>", "sections under the hero"],
]);

patch("src/app/layout.js", [['<html lang="en">', '<html lang="en" className="scroll-smooth">', "smooth scrolling"]]);

patch("src/app/book/page.js", [
  ["export default function BookPage() {", "export default function BookPage({ searchParams }) {", "searchParams"],
  ["            <Form />", "            <Form searchParams={searchParams} />", "pass it on"],
  ["async function Form() {", 'async function Form({ searchParams }) {\n  const { department = "" } = await searchParams;', "read department"],
  ["  return <BookingForm departments={departments} minDate={today} maxDate={shiftDate(today, MAX_DAYS_AHEAD)} />;",
   `  // From a "Book with …" button on the homepage: preselect that department if it exists
  const preselect = departments.some((d) => d.id === department) ? department : "";
  return (
    <BookingForm
      departments={departments}
      minDate={today}
      maxDate={shiftDate(today, MAX_DAYS_AHEAD)}
      defaultDepartmentId={preselect}
    />
  );`, "preselect"],
]);

patch("src/app/book/BookingForm.js", [
  ["export default function BookingForm({ departments, minDate, maxDate }) {",
   'export default function BookingForm({ departments, minDate, maxDate, defaultDepartmentId = "" }) {', "prop"],
  ['defaultValue={v.departmentId ?? ""}', "defaultValue={v.departmentId ?? defaultDepartmentId}", "default"],
]);

console.log(failed ? "\nSome edits were skipped — paste this output to Claude." : "\nAll edits applied.");
