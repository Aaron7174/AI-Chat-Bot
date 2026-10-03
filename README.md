# Employee Chatbot

A full-stack employee assistant built with React, Vite, Express, and a JavaScript employee data source. The application lets users browse employees, view details, and ask natural-language questions about employees through a chatbot.

## Features

- Dashboard with employee statistics
- Employee listing with search and filters
- Employee details page
- IT and non-IT employee views
- Department overview
- Role-aware attendance register and employee self-service
- Employee AI chatbot
- Responsive dark dashboard design
- Beginner-friendly code structure

## Technologies

### Frontend
- React.js
- Vite
- JavaScript
- CSS
- Axios
- React Router DOM

### Backend
- Node.js
- Express.js
- CORS
- dotenv

## Folder Structure

```bash
employee-chatbot/
├── backend/
│   ├── .env
│   ├── data/
│   │   └── employees.js
│   ├── controllers/
│   │   ├── employeeController.js
│   │   └── chatController.js
│   ├── routes/
│   │   ├── employeeRoutes.js
│   │   └── chatRoutes.js
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── README.md
└── .gitignore
```

## Installation

### Backend setup

```bash
cd backend
npm install
```

Create a `.env` file if needed:

```env
PORT=5000
```

### Frontend setup

```bash
cd frontend
npm install
```

## Run the Application

### Start backend

```bash
cd backend
node server.js
```

### Start frontend

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

Open:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## API Endpoints

### Employee endpoints

- `GET /api/employees` - returns all employees
- `GET /api/employees/it` - returns IT employees
- `GET /api/employees/non-it` - returns non-IT employees
- `GET /api/employees/departments` - returns department names and employee counts
- `GET /api/employees/:id` - returns one employee by ID
- `GET /api/employees/departments/:department` - returns employees by department

### User provisioning

- `POST /api/users` - ADMIN-only account provisioning. The request body must include `name`, `email`, `password` (minimum 12 characters), and `role` (`ADMIN`, `HR`, or `EMPLOYEE`). EMPLOYEE accounts must also provide `employeeId` matching an existing employee record; the account email must match that employee's email.

### Chatbot endpoint

- `POST /api/chat` - processes natural-language employee questions

### Attendance endpoints

- `GET /api/attendance` - paginated register built from active Employee records (HR/Admin)
- `GET /api/attendance/today` - current employee's attendance and server-time calculation
- `GET /api/attendance/me/history?month=YYYY-MM` - own monthly history and percentage
- `GET /api/attendance/employee/:employeeId/history` - employee history (HR/Admin)
- `POST /api/attendance/check-in` and `POST /api/attendance/check-out` - server-timestamped attendance actions
- `POST /api/attendance/correction` - request a correction; never directly edits official times
- `GET /api/attendance/corrections` and `PUT /api/attendance/corrections/:id/{approve,reject}` - HR/Admin correction review
- `GET /api/attendance/analytics` and `GET /api/attendance/reports.csv` - filtered daily metrics and CSV export
- `GET /api/attendance/integrity` - Admin integrity diagnostics
- `GET /api/attendance/policy` and `PUT /api/attendance/policy` - view/update company schedule, timezone, weekend days, holidays, and WFH policy

## How the Chatbot Works

The chatbot reads the incoming message and matches keywords such as:

- `IT employees`
- `non IT employees`
- `find Aaron`
- `how many IT employees`
- `employees in HR`

It then searches the employee data and returns a response plus employee records when relevant.

## How to Add Employees

Open `backend/data/employees.js` and add a new employee object to the array.

Example:

```js
{
  id: 23,
  name: 'John',
  email: 'john@example.com',
  phone: '9876543210',
  department: 'IT',
  category: 'IT',
  role: 'Software Developer',
  location: 'Chennai',
  joiningDate: '2025-01-20',
  salary: 50000,
  skills: ['React', 'Node.js', 'SQL']
}
```

## Production Upgrade Notes

- MongoDB/Mongoose support is now enabled via `MONGODB_URI` with a safe in-memory fallback when MongoDB is unavailable.
- Authentication and authorization are enforced on protected routes using JWT and permission checks.
- Employee APIs now support validation, pagination, filtering, and safe CRUD flows.
- The frontend uses the Vite environment variable `VITE_API_BASE_URL` instead of a hard-coded localhost URL.
- The backend includes example environment configuration in `backend/.env.example`.

## Authentication and Roles

The backend supports three roles:

- **ADMIN** - employee management, attendance register, policy management, correction review, reporting, and integrity diagnostics.
- **HR** - employee directory, attendance register, correction review, and chatbot access; employee creation, editing, deletion, export, and salary visibility are restricted.
- **EMPLOYEE** - self-only attendance, check-in/check-out, history, and correction requests; company-wide employee and attendance data remain restricted.

When MongoDB is connected, login and request authentication use persisted user accounts. Passwords are hashed with bcrypt; permissions are derived from the stored role on the server, not accepted from the browser or JWT. The `POST /api/users` endpoint requires the `MANAGE_USERS` permission (ADMIN only), and accepts `name`, `email`, `password`, `role`, and optionally `employeeId`. EMPLOYEE accounts must link to an existing employee ID; the supplied email must match that employee record. Accounts can be linked only once. Deleting a linked employee deactivates that user account.

Create the first administrator with MongoDB available:

1. Set `MONGODB_URI`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` in the backend environment. The initial password must be at least 12 characters.
2. Run `npm --prefix backend run create-admin` from the repository root (or `npm run create-admin` from `backend`).
3. Remove the bootstrap password from the environment after the account is created.
4. Start the API with `JWT_SECRET` configured.

The bootstrap command refuses to run without MongoDB or when an ADMIN already exists. Additional accounts, including further admins, are provisioned through the authenticated user-management endpoint.

When MongoDB is unavailable, the API retains in-memory development fixtures. These credentials work only in that fallback mode and are development-only:

| Role | Username | Password |
| --- | --- | --- |
| ADMIN | `admin` | `Admin123!` |
| HR | `hr` | `Hr123!` |
| EMPLOYEE | `employee` | `Employee123!` |

## Attendance management

Attendance is stored only when MongoDB is connected. It does not create sample attendance or fall back to a second in-memory register. Each record references the existing Employee `_id`; a unique database index on `(employeeId, date)` prevents duplicate daily records. Employee names and department details are read from the Employee collection when the register is rendered, so profile updates do not create duplicate employee snapshots.

The initial company policy uses `Asia/Kolkata`, Monday-Friday working days, 09:00-18:00 hours, a 60-minute break, a 10-minute lateness threshold, and a 240-minute half-day threshold. Admins can configure the timezone, schedule, weekdays, holidays, and whether self-service WFH check-in is allowed. Check-in and check-out timestamps always come from the backend clock. Missing attendance remains unresolved in the register and is never silently treated as absence.

Monthly attendance percentage is present-equivalent working days divided by eligible working days through the current date (or the end of a completed month); half days count as 0.5, present/late/WFH count as 1, holidays and configured non-working days are excluded, and the employee's joining date limits eligibility. There is no leave-management module in this project yet, so approved leave is not automatically synchronized into attendance. Voice, push-notification, and PWA modules were also not present in the inspected project and are not simulated by this implementation.

The attendance dashboard and APIs require MongoDB. Configure `MONGODB_URI` and `JWT_SECRET` before creating linked Employee user accounts; in-memory login fixtures intentionally cannot create attendance records.

Set a private `JWT_SECRET` before starting the backend. The API refuses to start without it; never use a sample or committed secret in deployment. To configure local development, copy `backend/.env.example` to `backend/.env` and replace the placeholder values.

### Remaining platform phases

Leave, salary-impact workflows, announcements, notifications, helpdesk tickets, the knowledge base, secure documents, conversation history, and broader platform analytics remain to be implemented. The current analytics page is based on employee directory data; the attendance register provides its own daily counts and CSV reports. Live MongoDB behavior requires a configured MongoDB service and should be verified in that environment.

## Beginner Notes

- React state stores data that changes in the UI.
- `useEffect` runs when a component loads or when data changes.
- Axios sends HTTP requests from the frontend to the backend.
- Express routes define the backend API endpoints.
- Requests carry data from the client to the server, and responses send data back to the client.
