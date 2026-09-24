# Employee Chatbot

A full-stack employee assistant built with React, Vite, Express, and a JavaScript employee data source. The application lets users browse employees, view details, and ask natural-language questions about employees through a chatbot.

## Features

- Dashboard with employee statistics
- Employee listing with search and filters
- Employee details page
- IT and non-IT employee views
- Department overview
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
- `GET /api/employees/:id` - returns one employee by ID
- `GET /api/employees/departments/:department` - returns employees by department

### Chatbot endpoint

- `POST /api/chat` - processes natural-language employee questions

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

## Future Improvements

- Replace the sample JavaScript array with MongoDB
- Add authentication
- Add employee creation and update features
- Add chart-based analytics
- Improve chatbot NLP with better keyword matching or AI API integration

## Beginner Notes

- React state stores data that changes in the UI.
- `useEffect` runs when a component loads or when data changes.
- Axios sends HTTP requests from the frontend to the backend.
- Express routes define the backend API endpoints.
- Requests carry data from the client to the server, and responses send data back to the client.
