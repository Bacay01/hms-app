// Pure config + helpers — safe to import on server and client

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", permission: null, description: "Your daily overview." },
    ],
  },
  {
    label: "Patient care",
    items: [
      { label: "Patients", href: "/patients", permission: "patients.read", description: "Register, search and view patient records." },
      { label: "Appointments", href: "/appointments", permission: "appointments.read", description: "Bookings, walk-ins and doctor queues." },
      { label: "Consultations", href: "/consultations", permission: "clinical.read", description: "Vitals, notes, diagnoses and prescriptions." },
    ],
  },
  {
    label: "Services",
    items: [
      { label: "Laboratory", href: "/lab", permission: "lab.requests.read", description: "Test requests, samples and results." },
      { label: "Pharmacy", href: "/pharmacy", permission: "pharmacy.read", description: "Prescriptions, dispensing and drug stock." },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Billing", href: "/billing", permission: "billing.read", description: "Bills, payments and receipts." },
      { label: "HMO", href: "/hmo", permission: "hmo.manage", description: "HMO plans, authorizations and claims." },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Reports", href: "/reports", permission: "reports.read", description: "Revenue, patient counts and trends." },
      { label: "Staff", href: "/staff", permission: "staff.manage", description: "Manage staff accounts and roles." },
      { label: "Audit log", href: "/audit", permission: "audit.read", description: "Who did what, and when." },
    ],
  },
];

const ROLE_LABELS = {
  ADMIN: "Administrator",
  RECEPTIONIST: "Receptionist",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  LAB_SCIENTIST: "Lab scientist",
  PHARMACIST: "Pharmacist",
  CASHIER: "Cashier",
  HMO_OFFICER: "HMO officer",
};

export function formatRole(role) {
  return ROLE_LABELS[role] ?? role;
}

export function can(permissions = [], permission) {
  return !permission || permissions.includes(permission);
}

export function navForPermissions(permissions = []) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(permissions, item.permission)),
  })).filter((group) => group.items.length > 0);
}
