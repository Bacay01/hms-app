# Ìlera Health — Hospital Management System

A full hospital management system for a Nigerian outpatient clinic with an inpatient ward: registration, appointments, triage queue, consultations, lab, pharmacy, billing, HMO/NHIA claims and reports — each staff role sees only what it needs.

Built with **Next.js 16 (App Router, Server Actions)**, **PostgreSQL (Neon) + Prisma 7**, **Tailwind CSS 4**, and plain JavaScript. Data structures and algorithms are hand-written in `src/lib/dsa` and covered by Jest tests.

## Features

| Area | What it does |
|---|---|
| Patients | Registration with hospital numbers (`ILH-2026-000001`), allergies, next of kin, NDPA consent, soft delete, printable patient card |
| Appointments | Booking against doctor schedules and leave, clash detection, rescheduling, no-shows, close of day, SMS reminders (daily cron) |
| Queue | Check-in and emergency check-in, triage priority (Emergency → Urgent → Normal), call next, 5-minute undo, public waiting-room TV screen (numbers only, no names) |
| Consultations | Vitals with abnormal flags, versioned clinical notes, ICD-style diagnoses, prescriptions with allergy and drug-interaction checks, lab requests, visit timeline |
| Lab | Worklist, sample collection with accession numbers, results against age- and sex-specific reference ranges, critical flags, two-person verification, printable reports |
| Pharmacy | Dispensing queue, first-expiry-first-out batch picking, stock receiving, adjustments with a full movement ledger, drug labels |
| Inpatient | Wards and beds, admission, transfers, nursing notes, medication charting, nightly bed charges, discharge summary |
| Billing | Bills that update automatically from orders, cash/POS/transfer payments, receipts with amount in words, online payments (Paystack or simulated gateway), discounts and refunds with two-person approval, end-of-day cash report |
| HMO / NHIA | HMO plans and coverage, patient enrolment, automatic patient/HMO bill split, pre-authorisation codes, monthly claims with CSV export |
| Reports | Revenue, visits and top diagnoses/drugs over any date range, CSV export |
| Security | Role-based permissions checked on the server for every page and action, session idle timeout, login rate limiting, audit log of every change and every record viewed |

## Roles

Admin · Receptionist · Doctor · Nurse · Lab scientist · Pharmacist · Cashier · HMO officer

## Data structures and algorithms

| Structure | File | Used for |
|---|---|---|
| Queue | `Queue.js` | Check-in order |
| Min-heap | `MinHeap.js` | Triage ordering, FEFO dispensing, top-k reports |
| Triage queue | `TriageQueue.js` | Priority + arrival order for the doctor's queue |
| Circular queue | `CircularQueue.js` | "Recently called" numbers on the TV screen |
| Stack | `Stack.js` | Undo of queue moves |
| Doubly linked list | `DoublyLinkedList.js` | Visit timeline (forward/back) |
| Trie | `Trie.js` | Diagnosis and drug search-as-you-type |
| Graph (adjacency list) | `Graph.js` | Drug–drug interaction checks |
| LRU cache | `LRUCache.js` | Recently viewed patients |
| Sliding-window rate limiter | `RateLimiter.js` | Login attempt limiting |
| Job queue | `JobQueue.js` | SMS reminders with concurrency and retries |
| Interval search | `intervals.js` | Appointment clash detection |
| Segment tree | `SegmentTree.js` | Revenue range sums in reports |
| Binary search | `lib/labRanges.js` | Age-band reference ranges |

## Getting started

```bash
git clone https://github.com/Bacay01/hms-app.git
cd hms-app
npm install
cp .env.example .env        # then fill in the values
npx prisma migrate deploy
npx prisma generate
npm run db:seed             # roles, permissions, departments, test staff
npm run db:seed-patients    # optional sample patients
npm run dev
```

Open http://localhost:3000. In development the login page lists demo accounts (password `Password123!`) — one per role.

## Environment variables

See `.env.example`. The main ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Neon Postgres (app / migrations) |
| `SESSION_SECRET` | Signs session cookies |
| `APP_URL` | Public address, used for payment callbacks |
| `PAYMENT_GATEWAY` | `simulated` or `paystack` |
| `SIMULATED_GATEWAY_SECRET` / `PAYSTACK_SECRET_KEY` | Webhook signing |
| `SMS_PROVIDER` | `simulated` prints SMS to the terminal |
| `CRON_SECRET` | Protects `/api/cron/reminders` |

## Tests

```bash
npm test
```

Jest covers the data structures and the pure business logic (billing sync, payment allocation, HMO split, lab ranges, prescribing checks, stock, reports).

## Project structure

```
prisma/            schema, migrations, seed scripts
src/app/(staff)/   staff pages and server actions, one folder per module
src/app/display/   public waiting-room screen
src/app/pay/       public online-payment pages
src/app/api/       payment webhook, reminder cron, health check
src/lib/           business logic
src/lib/dsa/       data structures + __tests__
```

## Author

Samuel "Bacay" Bakare — [github.com/Bacay01](https://github.com/Bacay01)
