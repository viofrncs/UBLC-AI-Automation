const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/gemini/chat - Main chat endpoint for n8n
router.post('/chat', async (req, res) => {
  try {
    const { message, context = "You are a helpful UBLC library assistant." } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required"
      });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash"
    });

    const prompt = `${context}\n\nUser: ${message}\nAssistant:`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      reply: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/gemini/models - List available models (for testing)
router.get('/models', async (req, res) => {
  try {
    // Note: This endpoint might require different API calls
    // For now, return available models we know work
    res.json({
      success: true,
      models: [
        "gemini-2.0-flash",
        "gemini-1.5-flash", 
        "gemini-1.5-pro"
      ],
      recommended: "gemini-2.0-flash"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;