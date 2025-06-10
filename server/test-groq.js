const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({
  apiKey:
    process.env.GROQ_API_KEY ||
    "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",
});

async function testGroqModels() {
  try {
    console.log("Testing Groq API connection...");

    // Get available models
    const models = await groq.models.list();
    console.log("\n=== Available Groq Models ===");
    models.data.forEach((model) => {
      console.log(`✓ ${model.id}`);
    });

    // Test a simple completion with the most reliable model
    console.log("\n=== Testing Chat Completion ===");
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: "Hello! Can you help me learn about machine learning?",
        },
      ],
      model: "llama-3.1-8b-instant", // Most reliable current model
      temperature: 0.7,
      max_tokens: 100,
    });

    console.log("✓ Chat completion successful!");
    console.log("Response:", completion.choices[0]?.message?.content);
  } catch (error) {
    console.error("❌ Groq API test failed:");
    console.error("Error:", error.message);
    if (error.status) {
      console.error("Status:", error.status);
    }
  }
}

// Run the test
testGroqModels();
