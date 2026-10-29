import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import pkg from "../src/generated/prisma/index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// Fictional demo patients — fake phone numbers
const PATIENTS = [
  { firstName: "Chiamaka", lastName: "Okeke", dob: "1990-03-14", sex: "FEMALE", phone: "08030000001", bloodGroup: "O+", genotype: "AS", allergies: "Sulfa drugs", address: "Bodija, Ibadan", nok: ["Uche Okeke", "08030000101", "Husband"] },
  { firstName: "Tunde", lastName: "Adewale", dob: "1985-07-22", sex: "MALE", phone: "08030000002", bloodGroup: "A+", genotype: "AA", address: "Ring Road, Ibadan", nok: ["Bisi Adewale", "08030000102", "Wife"] },
  { firstName: "Aisha", lastName: "Bello", dob: "1998-11-05", sex: "FEMALE", phone: "08030000003", bloodGroup: "B+", genotype: "AA", allergies: "Penicillin", address: "Challenge, Ibadan", nok: ["Musa Bello", "08030000103", "Husband"] },
  { firstName: "Emeka", lastName: "Nwosu", dob: "1972-01-30", sex: "MALE", phone: "08030000004", bloodGroup: "O-", genotype: "AA", address: "Dugbe, Ibadan", nok: ["Ada Nwosu", "08030000104", "Wife"] },
  { firstName: "Folake", lastName: "Ogunleye", dob: "2019-06-18", sex: "FEMALE", phone: "08030000005", bloodGroup: "O+", genotype: "SS", address: "Agodi, Ibadan", nok: ["Yemi Ogunleye", "08030000005", "Mother"] },
  { firstName: "Ibrahim", lastName: "Musa", dob: "1960-09-09", sex: "MALE", phone: "08030000006", bloodGroup: "AB+", genotype: "AA", allergies: "Aspirin", address: "Sabo, Ibadan", nok: ["Fatima Musa", "08030000106", "Daughter"] },
  { firstName: "Blessing", lastName: "Eze", dob: "2001-04-12", sex: "FEMALE", phone: "08030000007", bloodGroup: "A-", genotype: "AA", address: "UI Area, Ibadan", nok: ["Grace Eze", "08030000107", "Mother"] },
  { firstName: "Kelechi", lastName: "Obi", dob: "1995-12-25", sex: "MALE", phone: "08030000008", bloodGroup: "B-", genotype: "AS", address: "Oluyole, Ibadan", nok: ["Chidi Obi", "08030000108", "Brother"] },
];

const year = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric" }).format(new Date());

async function main() {
  const receptionist = await prisma.user.findUnique({ where: { email: "reception@hms.test" } });
  if (!receptionist) throw new Error("Run npm run db:seed first (receptionist not found).");

  let created = 0;
  for (const p of PATIENTS) {
    const exists = await prisma.patient.findFirst({
      where: { firstName: p.firstName, lastName: p.lastName, phone: p.phone },
    });
    if (exists) continue;

    await prisma.$transaction(async (tx) => {
      const key = `patient-${year}`;
      const counter = await tx.counter.upsert({
        where: { key },
        update: { value: { increment: 1 } },
        create: { key, value: 1 },
      });
      await tx.patient.create({
        data: {
          hospitalNumber: `ILH-${year}-${String(counter.value).padStart(6, "0")}`,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: new Date(`${p.dob}T00:00:00.000Z`),
          sex: p.sex,
          phone: p.phone,
          address: p.address,
          bloodGroup: p.bloodGroup,
          genotype: p.genotype,
          allergies: p.allergies ?? null,
          nextOfKinName: p.nok[0],
          nextOfKinPhone: p.nok[1],
          nextOfKinRelation: p.nok[2],
          consentGiven: true,
          consentAt: new Date(),
          registeredById: receptionist.id,
        },
      });
    });
    created++;
  }

  console.log(`Done: ${created} demo patients added (${PATIENTS.length - created} already existed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
