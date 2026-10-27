import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import pkg from "../src/generated/prisma/index.js";

const { PrismaClient } = pkg;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// ─────────────────────────────
// Permissions
// ─────────────────────────────
const PERMISSIONS = {
  "staff.manage": "Create, edit and deactivate staff",
  "patients.read": "View patient records",
  "patients.create": "Register new patients",
  "patients.update": "Edit patient details",
  "appointments.read": "View appointments and queues",
  "appointments.manage": "Book, reschedule and cancel appointments",
  "encounters.read": "View encounters",
  "encounters.create": "Start and close encounters",
  "vitals.write": "Record vital signs",
  "clinical.read": "View clinical notes and diagnoses",
  "clinical.write": "Write clinical notes and diagnoses",
  "prescriptions.write": "Write prescriptions",
  "lab.requests.read": "View lab requests",
  "lab.requests.create": "Request lab tests",
  "lab.results.write": "Enter lab results",
  "lab.results.verify": "Verify and release lab results",
  "pharmacy.read": "View prescriptions and drug stock",
  "pharmacy.dispense": "Dispense drugs",
  "inventory.manage": "Manage drug stock and adjustments",
  "billing.read": "View bills",
  "billing.payments": "Record payments",
  "billing.refunds.approve": "Approve refunds and discounts",
  "hmo.manage": "Manage HMOs, authorizations and claims",
  "reports.read": "View reports",
  "audit.read": "View the audit log",
};

// ─────────────────────────────
// Roles → permissions
// ─────────────────────────────
const ROLES = {
  ADMIN: {
    description: "Full system access",
    permissions: Object.keys(PERMISSIONS),
  },
  RECEPTIONIST: {
    description: "Front desk: registration and appointments",
    permissions: [
      "patients.read", "patients.create", "patients.update",
      "appointments.read", "appointments.manage",
      "encounters.read", "encounters.create",
    ],
  },
  DOCTOR: {
    description: "Consultations, diagnoses and prescriptions",
    permissions: [
      "patients.read", "appointments.read",
      "encounters.read", "encounters.create",
      "vitals.write", "clinical.read", "clinical.write",
      "prescriptions.write", "lab.requests.read", "lab.requests.create",
    ],
  },
  NURSE: {
    description: "Vitals and patient care",
    permissions: [
      "patients.read", "appointments.read", "encounters.read",
      "vitals.write", "clinical.read",
    ],
  },
  LAB_SCIENTIST: {
    description: "Laboratory tests and results",
    permissions: [
      "patients.read", "lab.requests.read",
      "lab.results.write", "lab.results.verify",
    ],
  },
  PHARMACIST: {
    description: "Dispensing and drug inventory",
    permissions: [
      "patients.read", "pharmacy.read", "pharmacy.dispense", "inventory.manage",
    ],
  },
  CASHIER: {
    description: "Bills and payments",
    permissions: ["patients.read", "billing.read", "billing.payments"],
  },
  HMO_OFFICER: {
    description: "HMO authorizations and claims",
    permissions: ["patients.read", "billing.read", "hmo.manage", "reports.read"],
  },
};

// ─────────────────────────────
// Test users (one per role)
// ─────────────────────────────
const TEST_PASSWORD = "Password123!";

const USERS = [
  { firstName: "Ade",     lastName: "Admin",      email: "admin@hms.test",      role: "ADMIN" },
  { firstName: "Rita",    lastName: "Reception",  email: "reception@hms.test",  role: "RECEPTIONIST" },
  { firstName: "Dayo",    lastName: "Doctor",     email: "doctor@hms.test",     role: "DOCTOR" },
  { firstName: "Ngozi",   lastName: "Nurse",      email: "nurse@hms.test",      role: "NURSE" },
  { firstName: "Laide",   lastName: "Lab",        email: "lab@hms.test",        role: "LAB_SCIENTIST" },
  { firstName: "Femi",    lastName: "Pharmacy",   email: "pharmacy@hms.test",   role: "PHARMACIST" },
  { firstName: "Chidi",   lastName: "Cashier",    email: "cashier@hms.test",    role: "CASHIER" },
  { firstName: "Halima",  lastName: "Hmo",        email: "hmo@hms.test",        role: "HMO_OFFICER" },
];

async function main() {
  console.log("Seeding permissions...");
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permIdByKey = Object.fromEntries(allPermissions.map((p) => [p.key, p.id]));

  console.log("Seeding roles...");
  const roleIdByName = {};
  for (const [name, { description, permissions }] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    roleIdByName[name] = role.id;

    // Reset this role's permissions so re-running the seed stays in sync
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((key) => ({ roleId: role.id, permissionId: permIdByKey[key] })),
    });
  }

  console.log("Seeding test users...");
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { roleId: roleIdByName[u.role] },
      create: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash,
        roleId: roleIdByName[u.role],
      },
    });
  }

  console.log(`Done: ${Object.keys(PERMISSIONS).length} permissions, ${Object.keys(ROLES).length} roles, ${USERS.length} users.`);
  console.log(`Test password for every user: ${TEST_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
