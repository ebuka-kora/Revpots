// Vercel serverless function wrapper for Express app
import express from 'express';
import cors from 'cors';
import { connectDB } from '../src/config/database.js';
import productRoutes from '../src/routes/products.js';
import invoiceRoutes from '../src/routes/invoices.js';
import syncRoutes from '../src/routes/sync.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB (only once, cached)
let dbConnected = false;
const ensureDB = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      console.error('DB connection error:', error);
      // Don't exit in serverless - just log
    }
  }
};

// Routes
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/sync', syncRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  await ensureDB();
  res.json({ status: 'ok', message: 'RevPilot API is running' });
});

// Vercel serverless function handler
export default async (req, res) => {
  await ensureDB();
  return app(req, res);
};
