# Project audit: AI Employee Assistant

## Existing architecture

- **Frontend:** React 19 and Vite 8, with React Router and Axios, under `frontend/`.
- **Backend:** Express 4 / Node.js under `backend/`.
- **Database:** MongoDB through Mongoose when `MONGODB_URI` is configured. Employee and user development fixtures are available when MongoDB is not connected. Attendance intentionally requires a live MongoDB connection.
- **Authentication:** Bearer JWT; protected requests reload the active user from the user service. `JWT_SECRET` is required to start the API.
- **Authorization:** `backend/config/permissions.js` defines `ADMIN`, `HR`, and `EMPLOYEE` permissions. Routes and service/controller flows enforce permissions on the backend. The frontend also uses those permissions to present navigation, but it is not the security boundary.

## Existing features

- Employee directory, employee details, departments, and employee-management routes.
- Employee dashboard and directory-based analytics.
- Attendance check-in/check-out, self history, HR/Admin register, correction workflows, policy, analytics, CSV reporting, and integrity tools.
- A deterministic rule-based chatbot for employee searches, counts, directory queries, profile lookup, and selected attendance queries/actions.
- PWA foundations: manifest, PNG icons, production service worker, install/update status, offline app-shell behavior, and mobile bottom navigation.

## Data models

- `Employee`: employee identity and work-profile fields.
- `User`: login identity, role, active status, and employee link.
- `Attendance`: date-keyed attendance and audit/action details.
- `AttendancePolicy`: company-wide attendance rules.
- There is no conversation, leave, announcement, notification, helpdesk, document, or knowledge-base model in the current project.

## API and chatbot architecture

- Express mounts `/api/auth`, `/api/users`, `/api/employees`, `/api/attendance`, and `/api/chat`.
- `POST /api/chat` requires authentication and `USE_AI`.
- The chatbot parses messages using `backend/services/chatIntentService.js`, then dispatches directly in `backend/controllers/chatController.js` to existing employee or attendance services.
- Attendance mutations are confirmation-gated and use the existing attendance service; they do not create success-shaped offline responses.
- The chatbot is a deterministic intent/regex implementation. There is no external LLM, RAG, tool registry, conversation persistence, or follow-up memory.

## Existing UI

- Authenticated pages share `App.jsx`, `Sidebar`, and `Navbar`.
- The chatbot is one route and uses React state for the current in-memory conversation.
- Mobile navigation and install/connection controls are present. The desktop sidebar scrolls independently.

## Missing or incomplete capabilities

- Persistent, user-scoped conversation history, rename/search/delete, and cross-turn context.
- Central declarative AI tool catalog with per-tool schemas, role/permission metadata, and confirmation metadata. Current controller dispatch is manual but still uses backend permission checks.
- Leave management, salary-impact services, announcements, push notification delivery, helpdesk/tickets, company knowledge/RAG, document management, calendar, and a voice assistant.
- Real AI-provider integration and observability for model/tool calls.
- End-to-end automated coverage for the chatbot's HTTP/auth/tool-dispatch behavior. Current automated tests cover attendance calculations, selected intent cases, and role permission declarations.

## Risks and non-goals

- Do not advertise unavailable modules as supported, return fabricated company answers, or add role access just to make chat results available.
- Do not persist private conversations without ownership enforcement, retention/deletion behavior, and sensitive-data policy.
- Do not send salary or other restricted employee fields through chatbot projections. `toChatEmployee` is an explicit allowlist; preserve that pattern.
- Do not persistently cache authenticated API data in the PWA.
- The in-memory demo employee login is not linked to an employee record, so it cannot demonstrate employee self-attendance actions.

## Recommended implementation plan

1. **Conversational baseline:** audit architecture, add safe greeting/help intents, return truthful role-aware capability guidance, and test supported/unsupported intent classification.
2. **Intent and tool foundation:** separate intent/entity parsing from dispatch, add explicit schemas and permission metadata around existing employee/attendance services, and test each allowed/denied tool path.
3. **Conversation context:** add an ownership-scoped conversation model and APIs, retention/deletion rules, and bounded context handling before enabling persistent memory.
4. **Real company modules:** implement leave, knowledge, helpdesk, announcements, and notifications as independently permissioned backend modules before exposing their chatbot tools.
5. **AI provider and safety:** add a selected provider behind an application-owned tool interface, strict output policy, timeout/error handling, confirmation flow, and cost/latency monitoring. Keep deterministic tools authoritative.
6. **Voice, analytics, and hardening:** connect speech I/O to the same authenticated chat endpoint, then complete browser/device, RBAC, privacy, and production integration tests.

## Current phase

The deterministic chat foundation recognizes greetings/help, guards unavailable leave, salary, helpdesk, announcements/notifications, voice, and policy requests, and now asks clarification when directory/attendance queries are incomplete or ambiguous. Employee attendance history can target this month or last month using the configured company timezone. Results still come only from existing services, with current authentication and permissions enforced server-side. Persistent conversation context, an external LLM, and unsupported company modules are not included.
