const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { connectToDatabase } = require('./config/database');
const { getJwtSecret } = require('./middleware/authMiddleware');
const employeeRoutes = require('./routes/employeeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({
    message: 'Employee AI chatbot backend is running.',
    database: process.env.MONGODB_URI ? 'MongoDB configured' : 'Fallback dataset active',
  });
});

app.use('/api/employees', employeeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});

const startServer = async () => {
  getJwtSecret();
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer();
