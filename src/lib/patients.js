// Pure patient helpers — safe on server and client

export const HOSPITAL_NUMBER_PREFIX = "ILH";
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const GENOTYPES = ["AA", "AS", "AC", "SS", "SC", "CC"];
export const SEX_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

export function parsePatientForm(formData) {
  const get = (key) => String(formData.get(key) ?? "").trim();
  const optional = (key) => get(key) || null;

  const firstName = get("firstName");
  const lastName = get("lastName");
  const dob = get("dateOfBirth");
  const sex = get("sex");
  const phone = get("phone");
  const email = get("email").toLowerCase();
  const bloodGroup = optional("bloodGroup");
  const genotype = optional("genotype");

  if (!firstName || !lastName) return { error: "First and last name are required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: "Enter a valid date of birth." };

  const dateOfBirth = new Date(`${dob}T00:00:00.000Z`);
  if (Number.isNaN(dateOfBirth.getTime())) return { error: "Enter a valid date of birth." };
  if (dateOfBirth > new Date()) return { error: "Date of birth can't be in the future." };

  if (!SEX_OPTIONS.some((s) => s.value === sex)) return { error: "Select the patient's sex." };
  if (!PHONE_RE.test(phone)) return { error: "Enter a valid phone number." };
  if (email && !EMAIL_RE.test(email)) return { error: "Enter a valid email address, or leave it blank." };
  if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup)) return { error: "Select a valid blood group." };
  if (genotype && !GENOTYPES.includes(genotype)) return { error: "Select a valid genotype." };

  return {
    data: {
      firstName,
      lastName,
      otherNames: optional("otherNames"),
      dateOfBirth,
      sex,
      phone,
      email: email || null,
      address: optional("address"),
      nextOfKinName: optional("nextOfKinName"),
      nextOfKinPhone: optional("nextOfKinPhone"),
      nextOfKinRelation: optional("nextOfKinRelation"),
      bloodGroup,
      genotype,
      allergies: optional("allergies"),
    },
  };
}

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : "—";
}

export function formatDateTime(value) {
  return value ? dateTimeFormat.format(new Date(value)) : "—";
}

export function ageFrom(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

export function formatSex(sex) {
  return SEX_OPTIONS.find((s) => s.value === sex)?.label ?? sex;
}

export function fullName(p) {
  return [p.firstName, p.otherNames, p.lastName].filter(Boolean).join(" ");
}

// "None", "Nil", "Nothing", "N/A", "NKDA" etc. mean no known allergies
const NO_ALLERGY_RE = /^(none|nil|nothing|no|n\/?a|nkda|nka|no known( drug)? allerg(y|ies))\.?$/i;

export function hasKnownAllergies(allergies) {
  const value = String(allergies ?? "").trim();
  return value.length > 0 && !NO_ALLERGY_RE.test(value);
}

// Prisma "where" for searching patients: every word must match somewhere
export function patientSearchWhere(query) {
  const terms = String(query ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 4);
  return {
    deletedAt: null,
    AND: terms.map((t) => ({
      OR: [
        { hospitalNumber: { contains: t, mode: "insensitive" } },
        { firstName: { contains: t, mode: "insensitive" } },
        { lastName: { contains: t, mode: "insensitive" } },
        { otherNames: { contains: t, mode: "insensitive" } },
        { phone: { contains: t } },
      ],
    })),
  };
}
