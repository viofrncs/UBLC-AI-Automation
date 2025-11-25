require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const chatRoutes = require('./routes/chat');
const booksRoutes = require('./routes/books');
const reserveRoutes = require('./routes/reserve');
const geminiRoutes = require('./routes/gemini'); // Add Gemini routes

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many chat requests, please slow down.' }
});

app.use(generalLimiter);
app.use('/api/chat', chatLimiter);
app.use('/api/gemini', chatLimiter);

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/reserve', reserveRoutes);
app.use('/api/gemini', geminiRoutes);

// Health check - Updated for n8n
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    config: {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      sendgrid: !!process.env.SENDGRID_API_KEY,
      sheets: !!process.env.GOOGLE_SHEET_ID,
      n8n: !!process.env.N8N_WEBHOOK_URL // Changed from zapier to n8n
    },
    endpoints: {
      chat: '/api/chat',
      books: '/api/books',
      reserve: '/api/reserve',
      gemini: '/api/gemini',
      health: '/api/health'
    }
  };
  res.json(health);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'UBLC AI Automation Backend - n8n Integrated',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      books: '/api/books',
      reserve: '/api/reserve',
      gemini: '/api/gemini'
    },
    automation: 'n8n Workflow Integration'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET  /',
      'GET  /api/health',
      'POST /api/chat',
      'GET  /api/books',
      'POST /api/reserve',
      'POST /api/gemini/chat'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 UBLC Backend running on http://localhost:${PORT}`);
  console.log('\n📋 Configuration Check:');
  console.log(`   OpenAI: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
  console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
  console.log(`   SendGrid: ${process.env.SENDGRID_API_KEY ? '✅' : '❌'}`);
  console.log(`   Google Sheets: ${process.env.GOOGLE_SHEET_ID ? '✅' : '❌'}`);
  console.log(`   n8n Webhook: ${process.env.N8N_WEBHOOK_URL ? '✅' : '⚠️ Optional'}`);
  
  console.log('\n🔗 Available Endpoints:');
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`   Books API: http://localhost:${PORT}/api/books`);
  console.log(`   Reserve API: http://localhost:${PORT}/api/reserve`);
  console.log(`   Gemini API: http://localhost:${PORT}/api/gemini/chat`);
  console.log('\n🤖 n8n Integration Ready');
  console.log('💡 Tip: Test with: curl http://localhost:3000/api/health\n');
});