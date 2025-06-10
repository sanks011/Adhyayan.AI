const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Middleware to verify JWT token (assuming you have this)
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Chat with Groq API
router.post("/groq", verifyToken, async (req, res) => {
  try {
    const { message, context, subject } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log("Chat request:", { message, context, subject });

    // Create a comprehensive prompt for educational assistance
    const systemPrompt = `You are an expert educational AI assistant specializing in helping students learn and understand complex topics. You provide clear, accurate, and engaging explanations tailored to the student's learning level.

Guidelines:
1. Always provide educational, accurate, and helpful responses
2. Break down complex concepts into understandable parts
3. Use examples and analogies when helpful
4. Encourage critical thinking and deeper understanding
5. Be supportive and encouraging in your tone
6. If you're unsure about something, acknowledge it honestly
7. Provide practical learning tips when relevant

Current learning context:
${context ? `Topic: ${context}` : "General learning assistance"}
${subject ? `Subject: ${subject}` : ""}

Please provide a helpful, educational response to the student's question.`;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response =
      completion.choices[0]?.message?.content ||
      "I apologize, but I was unable to generate a response. Please try asking your question again.";

    console.log("Groq response generated successfully");

    res.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in Groq chat:", error);

    // Handle specific Groq API errors
    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait a moment before trying again.",
        details: "Too many requests",
      });
    }

    if (error.status === 401) {
      return res.status(500).json({
        error: "AI service configuration error. Please contact support.",
        details: "Authentication failed",
      });
    }

    res.status(500).json({
      error: "Failed to generate AI response. Please try again.",
      details: error.message,
    });
  }
});

module.exports = router;
