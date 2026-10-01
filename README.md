# BANKFLOW — Digital Queue & Appointment Management System

> **Fintech Branch Flow Optimization for Banks and Financial Centers**  
> Developed for Hackathon Software Engineering Project.

---

## 1. Project Overview

**BankFlow** is an enterprise-grade digital queue and appointment management platform specifically engineered for bank branches. Unlike mobile banking apps designed for funds and account transactions, BankFlow tackles physical congestion, chaotic lobby waiting, and branch staff overloads.

It seamlessly unifies **scheduled customer appointments** with **real-time walk-in digital queues**, giving customers live mobile queue visibility while equipping branch staff and management with real-time dispatch and analytics.

---

## 2. Key Capabilities & Workflow

```
Customer Arrival / Remote Booking
           │
           ├──────────────────────────────┬──────────────────────────────┐
           ▼                                                             ▼
1. Scheduled Appointment                                      2. Walk-in Queue Join
   • Browse Bank Departments & Services                          • Select Banking Service
   • Select Date & Real-time Available Slot                      • Instant Digital Token Generated
   • Book & Receive Unique Appointment #                         • Assigned Queue Position
           │                                                             │
           ▼                                                             ▼
3. Branch Arrival & Check-In                                  4. Dynamic Wait Calculation
   • Mobile Check-In on Appointment Date                         • (People Ahead × Avg Duration) ÷ Active Counters
   • Automatically Enters Queue with Priority                    • Re-calculated as Counters change status
           │                                                             │
           └──────────────────────────────┬──────────────────────────────┘
                                          ▼
                                5. Staff Service Desk
                                   • Call Next Customer
                                   • Voice & Visual Hall Announcement
                                   • Start Service → Complete Service
                                   • Skip / Handle No-Shows
                                          ▼
                                6. Executive Monitoring
                                   • Live Hall Board across all Counters
                                   • Real-time KPIs & Peak Hours
                                   • Smart AI Staffing Recommendations
```

---

## 3. Technology Stack & Architecture

- **Frontend**: React 18, Vite, React Router v6, Native CSS3 with Design Tokens (inspired by modern fintech banking dashboards), Context API, Fetch API with automatic session cookie forwarding.
- **Backend**: PHP 8.2+ REST-oriented JSON API, PDO with prepared statements, custom MVC + Service Layer architecture.
- **Database**: MariaDB / MySQL 8.x with strict foreign key constraints, unique indexes, and audit history logging.
- **Dev Servers**:
  - Frontend: `http://localhost:5173` (Vite with `/api` reverse proxy)
  - Backend: `http://localhost:8000` (PHP built-in server)

---

## 4. Code Location Map

Per project requirements, the core logic is strictly modularized:

| Functionality | Exact Implementation File | Description |
|---|---|---|
| **Waiting-Time Calculation** | [`QueueService.php`](file:///c:/Users/HP/OneDrive/Desktop/Hackathon/backend/services/QueueService.php#L6-L47) | Deterministic formula: `(People Ahead × Avg Duration) ÷ max(Active Counters, 1)` |
| **Dynamic Queue Recalculation** | [`QueueService.php`](file:///c:/Users/HP/OneDrive/Desktop/Hackathon/backend/services/QueueService.php#L63-L101) | Automatically triggered whenever counter status shifts to break/closed/available |
| **Token Generation & State Machine** | [`TokenService.php`](file:///c:/Users/HP/OneDrive/Desktop/Hackathon/backend/services/TokenService.php#L6-L95) | Formats token numbers (`{DeptCode}-{DailySeq}`) and manages state transitions |
| **Appointment Booking & Slot Logic** | [`AppointmentService.php`](file:///c:/Users/HP/OneDrive/Desktop/Hackathon/backend/services/AppointmentService.php#L13-L107) | Working hours boundary checks, slot availability, and duplicate prevention |
| **Appointment Check-In Flow** | [`AppointmentService.php`](file:///c:/Users/HP/OneDrive/Desktop/Hackathon/backend/services/AppointmentService.php#L112-L149) | Converts checked-in appointment to an active waiting token with priority |
| **Staff Queue Calling & Controls** | [`StaffController.php`](file:///c:/Users/HP/OneDrive/Desktop/Hackathon/backend/controllers/StaffController.php#L151-L300) | Atomic Call Next, Voice announcement, Recall, Skip (no-show), and Complete |
| **AI / Smart Heuristic Engine** | [`AnalyticsPage.jsx`](file:///c:/Users/HP/OneDrive/Desktop/Hackathon/frontend/src/pages/admin/AnalyticsPage.jsx#L42-L105) | Recommends counter opening/rebalancing based on active queue bottlenecks |
| **Database Schema & Constraints** | [`schema.sql`](file:///c:/Users/HP/OneDrive/Desktop/Hackathon/backend/database/schema.sql) | 8 relational tables with foreign keys and unique constraints |

---

## 5. Demo Accounts & Credentials

All demo accounts share the password: **`password123`**

| Role | Email | Password | Access Panel | Description |
|---|---|---|---|---|
| **Administrator** | `admin@bankflow.com` | `password123` | `/admin` | Branch Executive Dashboard, Live Hall Monitor, Analytics |
| **Manager** | `manager@bankflow.com` | `password123` | `/admin` | Counter Management, Staff Workload, Service Rules |
| **Staff 1** | `sarah@bankflow.com` | `password123` | `/staff` | Counter 1 (Customer Service) Operations & Calling |
| **Staff 2** | `mike@bankflow.com` | `password123` | `/staff` | Counter 2 (Customer Service) Operations & Calling |
| **Staff 3** | `lisa@bankflow.com` | `password123` | `/staff` | Counter 3 (Cash Operations) Operations & Calling |
| **Customer 1** | `john@example.com` | `password123` | `/customer` | Pre-registered customer |
| **Customer 2** | `jane@example.com` | `password123` | `/customer` | Pre-registered customer |
| **New Customer** | *Any email* | *Your password* | `/register` | Self-service registration available on landing screen |

---

## 6. How to Run Locally

### Prerequisites
- Node.js (v18+) & npm
- PHP 8.0+
- MariaDB / MySQL running on `localhost:3306`

### 1. Database Setup
```bash
# Using MySQL/MariaDB client:
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
php backend/database/reset_passwords.php
```

### 2. Start Backend API
```bash
cd backend
php -S localhost:8000 index.php
```
Backend API will be accessible at `http://localhost:8000`.

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 7. Demo Walkthrough Script (3 Minutes)

1. **Customer Journey**:
   - Open `http://localhost:5173` and log in as `john@example.com` / `password123`.
   - Go to **Bank Services**, review available services.
   - Click **Join Walk-in Queue** for "Account Opening".
   - View your live digital token (e.g. `CS-001`), see position ahead `#1`, and live calculated wait time.
2. **Staff Service**:
   - In another browser tab/window, open `http://localhost:5173` and log in as `sarah@bankflow.com` / `password123`.
   - In the Staff Panel, notice customer `CS-001` waiting in queue.
   - Click **CALL NEXT CUSTOMER**. Listen to the automated voice announcement: *"Token CS-001 — Please proceed to Counter 1."*
   - Return to the customer tab: notice the status changed to **CALLED** with guidance to proceed to Counter 1.
   - Staff clicks **Start Service** (timer begins).
   - Staff clicks **Complete Service**. Counter becomes available again.
3. **Executive / Management**:
   - Log in as `admin@bankflow.com` / `password123`.
   - Review the **Executive Dashboard**: view real-time completed count incremented, peak hours distribution, and live activity stream.
   - Switch to **Live Queue Monitor** to see all branch counters and active hall queues simultaneously.
   - Switch to **Analytics & Insights** to inspect automated Smart AI Staffing Recommendations.
