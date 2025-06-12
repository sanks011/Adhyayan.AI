const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const Groq = require("groq-sdk");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const tesseract = require("tesseract.js");
const sharp = require("sharp");
const mammoth = require("mammoth");
const fs = require("fs").promises;
const { fixBrokenJSON } = require("./fix_json"); // Import the JSON fixing utility
require("dotenv").config();

// Ensure JWT_SECRET exists or use a fallback for development
if (!process.env.JWT_SECRET) {
  console.warn(
    "JWT_SECRET not found in environment variables. Using fallback secret for development only."
  );
  process.env.JWT_SECRET = "adhyayan_ai_development_secret";
} else {
  console.log("Using JWT_SECRET from environment variables");
}

const app = express();
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Initialize Parsing AI Agent with dedicated API key from environment
const parsingGroq = new Groq({
  apiKey: process.env.PARSING_GROQ_API_KEY,
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "text/markdown",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, DOC, DOCX, TXT, MD, and image files are allowed."
        )
      );
    }
  },
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  console.log("Verifying token...");
  console.log("Auth header:", req.headers.authorization);

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.log("Authentication error: No token provided");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      console.log("JWT_SECRET value:", process.env.JWT_SECRET);
      return res.status(500).json({ error: "Server configuration error" });
    }

    console.log(
      "Verifying with secret:",
      process.env.JWT_SECRET.substring(0, 3) + "..."
    );
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded successfully:", decoded);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.log("JWT verification error:", jwtError.message);
      console.log("Token attempted to verify:", token.substring(0, 10) + "...");
      return res
        .status(401)
        .json({ error: "Invalid token", details: jwtError.message });
    }
  } catch (error) {
    console.log("Authentication error:", error.message);
    return res
      .status(401)
      .json({ error: "Invalid token", details: error.message });
  }
};

// File processing helper functions
const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
};

const extractTextFromImage = async (buffer) => {
  try {
    // Use sharp to ensure proper image format
    const processedImage = await sharp(buffer)
      .greyscale()
      .normalise()
      .png()
      .toBuffer();

    const {
      data: { text },
    } = await tesseract.recognize(processedImage, "eng", {
      logger: (m) => console.log(m), // Optional: log progress
    });

    return text;
  } catch (error) {
    console.error("Error extracting text from image:", error);
    throw new Error("Failed to extract text from image");
  }
};

const extractTextFromDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error("Failed to extract text from DOCX");
  }
};

// File upload and processing endpoint
app.post(
  "/api/upload/syllabus",
  verifyToken,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(
        "Processing file:",
        req.file.originalname,
        "Type:",
        req.file.mimetype
      );
      let extractedText = "";

      switch (req.file.mimetype) {
        case "text/plain":
        case "text/markdown":
          extractedText = req.file.buffer.toString("utf-8");
          break;

        case "application/pdf":
          extractedText = await extractTextFromPDF(req.file.buffer);
          break;

        case "application/msword":
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          extractedText = await extractTextFromDOCX(req.file.buffer);
          break;

        case "image/png":
        case "image/jpeg":
        case "image/jpg":
          extractedText = await extractTextFromImage(req.file.buffer);
          break;

        default:
          return res.status(400).json({ error: "Unsupported file type" });
      }

      // Clean up the extracted text
      extractedText = extractedText
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n\s*\n/g, "\n\n")
        .trim();

      console.log("Successfully extracted text, length:", extractedText.length);

      res.json({
        success: true,
        extractedText: extractedText,
        filename: req.file.originalname,
        fileSize: req.file.size,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({
        error: "Failed to process file",
        details: error.message,
      });
    }
  }
);

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: "", // You would get this from Firebase service account
  private_key: "", // You would get this from Firebase service account
  client_email: "", // You would get this from Firebase service account
  client_id: "", // You would get this from Firebase service account
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
};

// For now, we'll skip Firebase Admin initialization since we need service account key
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// MongoDB connection
let client;
let db;

const connectToMongoDB = async () => {
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db("adhyayan_ai");
    console.log("Connected to MongoDB Atlas");

    // Create indexes for better performance
    await db
      .collection("users")
      .createIndex({ firebase_uid: 1 }, { unique: true });
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("mindmaps").createIndex({ user_uid: 1 });

    console.log("MongoDB indexes created successfully");
  } catch (error) {
    console.error(
      "Error connecting to MongoDB (continuing without DB):",
      error.message
    );
  }
};

// Initialize MongoDB connection
connectToMongoDB();

// Middleware to verify JWT token is now defined at the top of the file

// Test route
app.get("/api/test", async (req, res) => {
  try {
    if (!db) {
      throw new Error("Database not connected");
    }
    const result = await db.admin().ping();
    res.json({
      message: "Backend connected",
      time: new Date(),
      dbStatus: "connected",
    });
  } catch (error) {
    console.error("Database connection error:");
    console.error(error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Authentication route - verify Google token and create session
app.post("/api/auth/google", async (req, res) => {
  try {
    const { idToken, user } = req.body;
    console.log("Google auth request received:", {
      uid: user?.uid,
      email: user?.email,
    });

    // For now, we'll trust the frontend verification
    // In production, you should verify the idToken with Firebase Admin SDK
    try {
      // Check if user exists in database
      let dbUser = null;
      if (db) {
        dbUser = await db
          .collection("users")
          .findOne({ firebase_uid: user.uid });

        if (!dbUser) {
          // Create new user
          const newUser = {
            firebase_uid: user.uid,
            email: user.email,
            display_name: user.displayName,
            photo_url: user.photoURL,
            created_at: new Date(),
            updated_at: new Date(),
          };
          await db.collection("users").insertOne(newUser);
          dbUser = newUser;
          console.log("Created new user in DB for:", user.email);
        } else {
          // Update existing user
          await db.collection("users").updateOne(
            { firebase_uid: user.uid },
            {
              $set: {
                display_name: user.displayName,
                photo_url: user.photoURL,
                updated_at: new Date(),
              },
            }
          );
          console.log("Updated existing user in DB:", user.email);
        }
      }
    } catch (dbError) {
      console.log(
        "Database not available, continuing without user storage:",
        dbError.message
      );
    } // Create JWT token
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET missing for token creation");
      process.env.JWT_SECRET = "adhyayan_ai_development_secret";
      console.log("Using fallback JWT_SECRET for development");
    }

    // Make sure we're using the correct JWT secret
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not found when creating token!");
      return res.status(500).json({ error: "Server configuration error" });
    }

    console.log(
      "Creating JWT token with secret:",
      process.env.JWT_SECRET.substring(0, 3) + "..."
    );

    const jwtToken = jwt.sign(
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(
      "JWT token created successfully, first 10 chars:",
      jwtToken.substring(0, 10) + "..."
    );

    res.json({
      success: true,
      token: jwtToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Get user profile
app.get("/api/user/profile", verifyToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const user = await db
      .collection("users")
      .findOne({ firebase_uid: req.user.uid });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Logout route
app.post("/api/auth/logout", verifyToken, (req, res) => {
  // In a real app, you might want to blacklist the token
  res.json({ success: true, message: "Logged out successfully" });
});

// Mind map generation endpoint
app.post("/api/mindmap/generate", verifyToken, async (req, res) => {
  try {
    console.log("Mind map generation request received");
    const { subjectName, syllabus } = req.body;
    
    if (!subjectName || !syllabus) {
      return res.status(400).json({ 
        error: "Missing required parameters", 
        details: "Subject name and syllabus content are required" 
      });
    }
    
    console.log(`Generating mind map for subject: ${subjectName}`);
    console.log(`Syllabus length: ${syllabus.length} characters`);
    console.log(`Syllabus preview: ${syllabus.substring(0, 200)}...`);
      // Extract meaningful content from the syllabus
    const extractedSyllabus = extractSyllabusContent(syllabus);
    console.log(`Extracted syllabus content: ${extractedSyllabus.length} characters`);
    
    // Try AI-powered parsing first
    let syllabusOutline = [];
    let aiParsedData = null;
    
    try {
      console.log("🤖 Attempting AI-powered syllabus parsing...");
      aiParsedData = await parseWithAI(subjectName, extractedSyllabus);
      
      // Convert AI parsed data to outline format
      syllabusOutline = aiParsedData.main_topics.map((topic, index) => ({
        id: topic.id || `unit_${index + 1}`,
        title: topic.title,
        type: 'module',
        unitType: 'Unit',
        unitNumber: topic.unit_number || String(index + 1),
        content: topic.title,
        topics: (topic.subtopics || []).map((subtopic, subIndex) => ({
          id: `topic_${index + 1}_${subIndex + 1}`,
          title: subtopic,
          content: `Details about ${subtopic}`
        }))
      }));
      
      console.log(`🤖 AI parsing successful! Found ${syllabusOutline.length} main sections`);
      
    } catch (aiError) {
      console.error("🚫 AI parsing failed:", aiError.message);
      console.log("📝 Falling back to traditional parsing...");
      
      // Fallback to traditional parsing
      syllabusOutline = parseSyllabusOutline(extractedSyllabus);
    }
      console.log(`Final outline contains ${syllabusOutline.length} top-level sections`);
    
    try {
      // Generate the AI prompt using parsed data if available
      const prompt = aiParsedData ? generateMindMapPrompt(subjectName, aiParsedData) : 
                                    generateMindMapPrompt(subjectName, { main_topics: syllabusOutline.map((item, index) => ({ 
                                      id: `topic_${index + 1}`, 
                                      title: item.title || `Topic ${index + 1}` 
                                    })) });
      
      // Get an AI-generated mind map using Groq
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert educational content creator specializing in creating detailed, hierarchical mind maps from educational syllabi. you are best at generating mind maps for academic subjects, breaking down complex topics into structured outlines with modules, topics, and subtopics. Your responses should be in JSON format with a clear structure."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-70b-8192",
        temperature: 0.5,
        max_tokens: 6000,
        top_p: 0.9
      });
      
      // Get the response text
      const responseText = completion.choices[0]?.message?.content;
      
      if (!responseText) {
        throw new Error("Empty response from AI");
      }
      
      console.log("AI response length:", responseText.length);
      
      // Extract the JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      let mindMapData;
        if (jsonMatch) {
        try {
          mindMapData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error("Error parsing JSON from AI response:", parseError, "at position:", parseError.message);
          console.log("JSON structure:", { 
            length: jsonMatch[0].length, 
            excerpt: jsonMatch[0].substring(Math.max(0, parseError.message.match(/\d+/) ? parseInt(parseError.message.match(/\d+/)[0]) - 30 : 0), 
                                         parseError.message.match(/\d+/) ? parseInt(parseError.message.match(/\d+/)[0]) + 30 : 50)
          });
          
          // Try to fix broken JSON
          try {
            const fixedJson = fixBrokenJSON(jsonMatch[0]);
            mindMapData = JSON.parse(fixedJson);
            console.log("Successfully fixed and parsed JSON!");
          } catch (fixError) {
            console.error("Failed to fix JSON:", fixError);
            throw new Error("Cannot parse or fix JSON from AI response");
          }
        }
      }
      
      if (!mindMapData) {
        throw new Error("Failed to extract valid JSON from AI response");
      }
      
      // Make sure the mind map has a unique ID
      const mindMapId = `mindmap_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      mindMapData.id = mindMapId;
      
      // Save to database if available
      if (db) {
        try {
          await db.collection("mindmaps").insertOne({
            id: mindMapId,
            user_uid: req.user.uid,
            title: subjectName,
            subject: subjectName,
            content: syllabus,
            mindmap_data: mindMapData,
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log("Mind map saved to database with ID:", mindMapId);
        } catch (dbError) {
          console.error("Error saving to database:", dbError);
          // Continue even if database save fails
        }
      }
        // Transform the mind map data to ensure proper formatting
      const transformedMindMapData = transformGroqResponse(mindMapData, subjectName);
      
      res.json({
        success: true,
        mindMap: transformedMindMapData
      });
      
    } catch (aiError) {
      console.error("AI processing error:", aiError);
        // Fall back to generating a basic mind map without AI
      console.log("Falling back to basic mind map generation");
      const fallbackMindMap = createSimpleFallbackMindMap(subjectName, syllabusOutline);
      
      res.json({
        success: true,
        mindMap: fallbackMindMap,
        note: "Used fallback generation due to AI service error"
      });
    }
  } catch (error) {
    console.error("Mind map generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate mind map",
      details: error.message
    });
  }
});

// AI-Powered Intelligent Syllabus Parser
const parseWithAI = async (subjectName, syllabusContent) => {
  try {
    console.log("🤖 Using AI agent for intelligent syllabus parsing...");
    
    const parsingPrompt = `You are an expert academic syllabus parser. Your task is to analyze the given syllabus and extract a clean, hierarchical structure.

SUBJECT: ${subjectName}

SYLLABUS CONTENT:
${syllabusContent}

Parse this syllabus and return ONLY a JSON object with the following structure:

{
  "subject_name": "Clean subject name without unit prefixes",
  "main_topics": [
    {
      "id": "topic_1",
      "title": "Clean topic title without unit prefixes or lecture hours",
      "unit_number": "I" or "1" (if applicable),
      "subtopics": [
        "Clean subtopic 1",
        "Clean subtopic 2",
        "Clean subtopic 3"
      ]
    },
    {
      "id": "topic_2", 
      "title": "Another topic title",
      "unit_number": "II" or "2",
      "subtopics": [
        "Subtopic A",
        "Subtopic B"
      ]
    }
  ]
}

PARSING RULES:
1. Extract main topics/units from the syllabus
2. Remove all unit prefixes (Unit I, Unit-I, Module I, etc.) from topic titles
3. Remove lecture hours, periods, marks, credits from all titles
4. Clean subtopics from bullet points, numbered lists, or content descriptions
5. Limit to maximum 8 main topics and 5 subtopics per topic
6. Use clean, academic language for all titles
7. Preserve the hierarchical structure of the syllabus

Return ONLY the JSON object, no additional text.`;

    const completion = await parsingGroq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert academic syllabus parser that extracts clean hierarchical structures from educational content. You always return valid JSON objects with the requested structure."
        },
        {
          role: "user",
          content: parsingPrompt
        }      ],
      model: "llama3-70b-8192",
      temperature: 0.1,
      max_tokens: 4000,
      top_p: 0.9
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error("Empty response from parsing AI");
    }

    console.log("🤖 AI parsing response length:", responseText.length);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Error parsing AI response JSON:", parseError);
      throw new Error("Invalid JSON from parsing AI");
    }

    // Validate the structure
    if (!parsedData.main_topics || !Array.isArray(parsedData.main_topics)) {
      throw new Error("Invalid structure from parsing AI");
    }

    console.log(`🤖 AI successfully parsed ${parsedData.main_topics.length} main topics`);
    return parsedData;

  } catch (error) {
    console.error("AI parsing error:", error);
    throw error;
  }
};

// Enhanced intelligent syllabus content extractor with structured format recognition
const extractSyllabusContent = (rawSyllabus) => {
  if (!rawSyllabus) return "";

  // Step 1: Detect if syllabus has structured tabular format
  const isTabularFormat = detectTabularFormat(rawSyllabus);

  if (isTabularFormat) {
    return extractStructuredContent(rawSyllabus);
  }
  
  // Step 2: Check if it's an academic course syllabus with modules/units
  const hasModules = /Module[\s\-:]*[IVX\d]+/i.test(rawSyllabus);
  const hasUnits = /Unit[\s\-:]*[IVX\d]+/i.test(rawSyllabus);
  
  if (hasModules || hasUnits) {
    console.log("Academic syllabus with modules/units detected");
    // For academic syllabi, we want to keep the entire content since
    // the unit/module structure is important for mind map generation
    return rawSyllabus;
  }
  
  // Step 3: Enhanced patterns to identify actual course content including academic unit formats
  const contentPatterns = [
    /course content[:\s]+(.*?)(?=text books?|reference books?|modes of evaluation|examination scheme|$)/is,
    /syllabus[:\s]+(.*?)(?=text books?|reference books?|modes of evaluation|examination scheme|$)/is,
    // Enhanced unit patterns for academic formats
    /unit[:\s-]+[IVX1-9]+[:\s]+(.*?)(?=text books?|reference books?|modes of evaluation|examination scheme|unit[:\s-]+[IVX1-9]+|$)/gis,
    /unit[\s]*-[\s]*[IVX1-9]+[:\s]+(.*?)(?=text books?|reference books?|modes of evaluation|examination scheme|unit[\s]*-[\s]*[IVX1-9]+|$)/gis,
    /(?:chapter|topic|module)[:\s]+\d+[:\s]+(.*?)(?=(?:chapter|topic|module)[:\s]+\d+|text books?|reference books?|$)/gis,
    /(?:module|unit)[\s\-]*[IVX\d]+[\s:.-]*(.*?)(?=(?:module|unit)[\s\-]*[IVX\d]+|books?|references|examination|$)/gis,
  ];

  let extractedContent = "";

  // Try each pattern
  for (const pattern of contentPatterns) {
    const matches = rawSyllabus.match(pattern);
    if (matches) {
      if (pattern.global) {
        extractedContent += matches.join("\n\n");
      } else {
        extractedContent += matches[1] || matches[0];
      }
    }
  }

  // If no pattern matches, try to extract unit-wise content manually
  if (!extractedContent) {
    const lines = rawSyllabus.split("\n");
    let isContentSection = false;
    let contentLines = [];

    for (const line of lines) {
      const trimmedLine = line.trim().toLowerCase();      // Enhanced patterns to capture academic unit formats and syllabus sections
      if (
        trimmedLine.includes("course content") ||
        trimmedLine.includes("syllabus") ||
        trimmedLine.includes("unit-") ||
        trimmedLine.includes("unit ") ||
        trimmedLine.match(/unit[:\s-]+[ivx1-9]/) ||
        trimmedLine.match(/unit[\s]*-[\s]*[ivx1-9]/) ||
        trimmedLine.match(/^unit[\s]*[ivx1-9]/i)
      ) {
        isContentSection = true;
        contentLines.push(line);
        continue;
      }

      // Stop capturing at reference sections
      if (
        isContentSection &&
        (trimmedLine.includes("text book") ||
          trimmedLine.includes("reference book") ||
          trimmedLine.includes("mode of evaluation") ||
          trimmedLine.includes("examination scheme") ||
          trimmedLine.includes("relationship between"))
      ) {
        break;
      }

      if (isContentSection) {
        contentLines.push(line);
      }
    }

    extractedContent = contentLines.join("\n");
  }

  // Clean up the extracted content
  extractedContent = extractedContent
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\n\-:,;\.]/g, " ")
    .trim();

  return extractedContent || rawSyllabus; // Return original if extraction fails
};

// Transform Groq response structure to expected frontend format
const transformGroqResponse = (groqData, subjectName) => {
  try {
    // Handle the nested mind_map structure
    if (groqData.mind_map) {      const mindMap = groqData.mind_map;
      const nodes = [];
      const edges = [];
      
      // Add central node - Always use the subject name for the central node, regardless of what the API returns
      nodes.push({
        id: "central",
        label: subjectName || "Central Topic",
        type: "root",
        level: 0,
        position: { x: 400, y: 300 },
        content: mindMap.central_node ? 
          (mindMap.central_node.content || mindMap.central_node.description || "") : 
          `This mind map provides a comprehensive overview of ${subjectName || "the subject"}. Explore the connected nodes to learn about specific topics and subtopics.`,
        isRoot: true,
        hasChildren: true,
        children: []
      });

      // Add module nodes (main topics), enhanced for academic units
      if (mindMap.module_nodes && Array.isArray(mindMap.module_nodes)) {
        // First ensure we have clean module titles without unit prefixes and lecture hours
        const cleanModules = mindMap.module_nodes.map(module => {
          // Create a deep copy to avoid mutating the original
          const cleanedModule = { ...module };
      // Clean the title from unit prefixes and lecture hours
          if (cleanedModule.title) {
            // Save the original unit/module number for reference
            const unitMatch = cleanedModule.title.match(/(?:Unit|Module)[\s\-:]*([IVX0-9]+)/i) || 
                              cleanedModule.title.match(/^([IVX]+)/i);
            const unitNum = unitMatch ? unitMatch[1] : '';
              // Clean excessive prefixes and preserve just the content
            if (unitMatch && unitNum) {
              // For academic unit titles, remove the prefix entirely
              const prefixRemoved = cleanedModule.title.replace(/^(Unit|Module|Chapter|Section)[\s\-:]*([IVX0-9]+)?[.\s:]*/i, '');
              cleanedModule.title = prefixRemoved;
            }
            
            // Clean up lecture hours and other metadata regardless
            cleanedModule.title = cleanedModule.title
              .replace(/\s*\d+\s*Lecture\s*Hours?\s*/i, '')
              .replace(/\s*\d+\s*hours?\s*/i, '')
              .replace(/\s*\(\s*\d+\s*hours?\s*\)/i, '')
              .replace(/\s*\d+\s*marks?\s*/i, '')
              // Clean up any remaining punctuation 
              .replace(/^[:\s,;-]+|[:\s,;-]+$/g, '')
              .trim();
                // If after cleaning the title is empty, fallback to a default title
            if (!cleanedModule.title || cleanedModule.title.length < 2) {
              // Use the original unit/module number if available
              const unitMatch = module.title.match(/(?:Unit|Module)[\s\-:]*([IVX0-9]+)/i) || 
                               module.title.match(/^([IVX]+)/i);
              const unitNum = unitMatch ? unitMatch[1] : `${index + 1}`;
              cleanedModule.title = `Topic ${unitNum} Content`;
            }
          }
          return cleanedModule;
        });
        
        // Now create separate nodes for each module
        cleanModules.forEach((module, index) => {
          const nodeId = `topic${index + 1}`;
          const yPos = 150 + (index * 100);
          
          nodes.push({
            id: nodeId,
            label: module.title || `Topic ${index + 1}`,
            type: "topic", 
            level: 1,
            position: { x: 700, y: yPos },
            content: module.content || module.description || "",
            parentNode: "central",
            hasChildren: true,
            children: []
          });

          // Add edge from central to this topic
          edges.push({
            id: `central-${nodeId}`,
            source: "central",
            target: nodeId,
            type: "bezier"
          });

          // Update central node children
          nodes[0].children.push(nodeId);
        });
      }      // Add subtopic nodes if they exist      // Helper function to clean node titles - enhanced to completely remove unit prefixes
      const cleanNodeTitle = (title) => {
        if (!title) return title;
        
        let cleanedTitle = title
          // First remove unit/module prefixes entirely
          .replace(/^(Unit|Module|Chapter|Section|Topic)[\s\-:]*([IVX0-9]+)?[.\s:]*/i, '')
          // Remove numbering at start
          .replace(/^\d+[\.\s]+/, '')
          // Remove bullet points
          .replace(/^[•\-\*]\s*/, '')
          // Clean various time/credit/marks references
          .replace(/\s*\d+\s*hours?\s*/i, '')
          .replace(/\s*\d+\s*marks?\s*/i, '')
          .replace(/\s*\d+\s*Lecture\s*Hours?\s*/i, '')
          .replace(/\s*\(\d+\s*hours?\)\s*/i, '')
          .replace(/\s*\(\d+\s*Lecture\s*Hours?\s*\)/i, '')
          // Clean up any remaining punctuation
          .replace(/^[:\s,;-]+|[:\s,;-]+$/g, '')
          .trim();
          
        // If after cleaning the title is empty, return a fallback
        if (!cleanedTitle || cleanedTitle.length < 2) {
          return title;
        }
        
        return cleanedTitle;
      };
      
      // Process all types of child nodes recursively
      const processChildNodes = (childNodes, parentNodeId, level, xPosition) => {
        if (!childNodes || !Array.isArray(childNodes) || childNodes.length === 0) return;
        
        // Clean all child nodes first
        const cleanedChildNodes = childNodes.map(node => {
          const cleanedNode = { ...node };
          if (cleanedNode.title) {
            cleanedNode.title = cleanNodeTitle(cleanedNode.title);
          }
          return cleanedNode;
        });
        
        // Group nodes by parent if parent info is available
        const nodesByParent = {};
        if (!nodesByParent[parentNodeId]) {
          nodesByParent[parentNodeId] = [];
        }
        
        cleanedChildNodes.forEach((node, index) => {
          nodesByParent[parentNodeId].push({
            ...node,
            index
          });
        });
        
        // Add all child nodes to their parent
        Object.entries(nodesByParent).forEach(([parentId, childNodes]) => {
          // Find parent node to get its position
          const parentNode = nodes.find(n => n.id === parentId);
          const baseYPos = parentNode?.position?.y || 150;
          
          childNodes.forEach((node, childIndex) => {
            // Generate a unique ID based on level and index
            const nodePrefix = level === 2 ? 'subtopic' : `level${level}_node`;
            const nodeId = `${nodePrefix}${node.index + 1}`;
            
            // Calculate position - each level is 300px to the right of the parent
            // and arranged vertically based on index
            const yPos = baseYPos - 100 + (childIndex * 100);
            
            nodes.push({
              id: nodeId,
              label: node.title || `${nodePrefix.charAt(0).toUpperCase() + nodePrefix.slice(1)} ${node.index + 1}`,
              type: level === 2 ? "subtopic" : `level${level}`,
              level: level,
              position: { x: xPosition, y: yPos },
              content: node.content || node.description || "",
              parentNode: parentId,
              hasChildren: node.children && Array.isArray(node.children) && node.children.length > 0,
              children: []
            });
            
            // Add edge from parent to this node
            edges.push({
              id: `${parentId}-${nodeId}`,
              source: parentId,
              target: nodeId,
              type: "bezier"
            });
            
            // Update parent node's children array
            if (parentNode) {
              parentNode.children.push(nodeId);
            }
            
            // Process this node's children recursively if they exist
            if (node.children && Array.isArray(node.children) && node.children.length > 0) {
              // Next level's x position is 300px to the right
              processChildNodes(node.children, nodeId, level + 1, xPosition + 300);
            }
          });
        });
      };
      
      // Process subtopics (level 2)
      if (mindMap.subtopic_nodes && Array.isArray(mindMap.subtopic_nodes)) {
        // Create clean copies of subtopics
        const cleanSubtopics = mindMap.subtopic_nodes.map(subtopic => {
          const cleanedSubtopic = { ...subtopic };
          
          // Store parent reference if available
          const parentUnit = subtopic.parent_unit || subtopic.parent_module || null;
          if (parentUnit) {
            cleanedSubtopic.parent_unit = parentUnit;
          }
          
          // Clean the title
          if (cleanedSubtopic.title) {
            cleanedSubtopic.title = cleanNodeTitle(cleanedSubtopic.title);
          }
          return cleanedSubtopic;
        });
        
        // Group subtopics by parent unit if available, otherwise fallback to evenly distributing
        const subtopicsByParent = {};
        const moduleCount = mindMap.module_nodes ? mindMap.module_nodes.length : 1;
        
        cleanSubtopics.forEach((subtopic, index) => {
          const parentUnit = subtopic.parent_unit || subtopic.parent_module;
          
          // If parent info exists, use it to group
          if (parentUnit) {
            // Find the matching parent index
            let parentIndex = mindMap.module_nodes.findIndex(
              module => module.title === parentUnit || module.id === parentUnit
            );
            
            // If parent not found, distribute evenly
            if (parentIndex === -1) {
              parentIndex = Math.floor(index / Math.max(1, Math.ceil(cleanSubtopics.length / moduleCount)));
            }
            
            const parentId = `topic${parentIndex + 1}`;
            
            if (!subtopicsByParent[parentId]) {
              subtopicsByParent[parentId] = [];
            }
            
            subtopicsByParent[parentId].push({
              ...subtopic,
              index
            });
          } else {
            // No parent info, distribute evenly
            const parentTopicIndex = Math.floor(index / Math.max(1, Math.ceil(cleanSubtopics.length / moduleCount)));
            const parentTopicId = `topic${parentTopicIndex + 1}`;
            
            if (!subtopicsByParent[parentTopicId]) {
              subtopicsByParent[parentTopicId] = [];
            }
            
            subtopicsByParent[parentTopicId].push({
              ...subtopic,
              index
            });
          }
        });
        
        // Add subtopics to their parents at level 2
        Object.entries(subtopicsByParent).forEach(([parentTopicId, subtopics]) => {
          subtopics.forEach((subtopic, subIndex) => {
            const subtopicId = `subtopic${subtopic.index + 1}`;
            const baseYPos = nodes.find(n => n.id === parentTopicId)?.position?.y || 150;
            const yPos = baseYPos - 80 + (subIndex * 80);
            
            const hasChildren = subtopic.children && 
                              Array.isArray(subtopic.children) && 
                              subtopic.children.length > 0;

            nodes.push({
              id: subtopicId,
              label: subtopic.title || `Subtopic ${subtopic.index + 1}`,
              type: "subtopic",
              level: 2,
              position: { x: 1000, y: yPos },
              content: subtopic.content || subtopic.description || "",
              parentNode: parentTopicId,
              hasChildren: hasChildren,
              children: []
            });

            // Add edge from parent topic to subtopic
            edges.push({
              id: `${parentTopicId}-${subtopicId}`,
              source: parentTopicId,
              target: subtopicId,
              type: "bezier"
            });
            
            // Update parent topic children
            const parentNode = nodes.find(n => n.id === parentTopicId);
            if (parentNode) {
              parentNode.children.push(subtopicId);
            }
            
            // Process deeper levels recursively if they exist (level 3+)
            if (hasChildren) {
              // Process at x position 1300 (300px right of subtopics)
              processChildNodes(subtopic.children, subtopicId, 3, 1300);
            }
          });
        });
      }
      
      // Check for additional node types like sub-subtopics (level 3) directly in the mindMap
      if (mindMap.sub_subtopic_nodes && Array.isArray(mindMap.sub_subtopic_nodes)) {
        // Find their parents and process them
        const subSubtopics = mindMap.sub_subtopic_nodes.map((node, index) => ({
          ...node,
          index
        }));
        
        // Group by parent
        const nodesByParent = {};
        subSubtopics.forEach(node => {
          const parentId = node.parent_id || node.parent_subtopic;
          
          if (!parentId) return; // Skip if no parent reference
          
          if (!nodesByParent[parentId]) {
            nodesByParent[parentId] = [];
          }
          
          nodesByParent[parentId].push(node);
        });
        
        // For each parent, add its children
        Object.entries(nodesByParent).forEach(([parentSubtopicTitle, childNodes]) => {
          // Find parent node by title
          const parentNode = nodes.find(n => 
            n.type === "subtopic" && 
            (n.label === parentSubtopicTitle || n.id === parentSubtopicTitle)
          );
          
          if (parentNode) {
            // Process these nodes at level 3, x position 1300
            processChildNodes(childNodes, parentNode.id, 3, 1300);
          }
        });
      }
      

      return {
        title: mindMap.central_node?.title || "Mind Map",
        subject: mindMap.central_node?.title || "Subject",
        nodes: nodes,
        edges: edges
      };
    }

    // If not the expected structure, return as-is
    return groqData;
  } catch (error) {
    console.error("Error transforming Groq response:", error);
    return groqData;
  }
};

// Advanced syllabus parser that creates hierarchical outline (modules -> topics -> subtopics)
const parseSyllabusOutline = (syllabus) => {
  console.log("📝 Starting syllabus parsing...");
  
  // Clean and normalize the syllabus text
  let processedSyllabus = syllabus
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\r/g, '\n')    // Handle old Mac line endings
    .trim();
  
  // Split by unit headers and process each section
  const unitSections = [];
  const lines = processedSyllabus.split('\n');
  let currentUnit = null;
  let currentContent = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
      // Check if this line is a unit header
    // Enhanced regex to match "Unit I", "UNIT I", "Unit-I" and other common formats
    const unitMatch = trimmedLine.match(/^(Unit[\s\-]+[IVX\d]+|UNIT[\s\-]+[IVX\d]+|Module[\s\-]+[IVX\d]+|MODULE[\s\-]+[IVX\d]+)[\s:]*(.*)$/i);
    
    if (unitMatch) {
      // Save previous unit if exists
      if (currentUnit) {
        unitSections.push({
          header: currentUnit,
          content: currentContent.join('\n').trim()
        });
      }
      
      // Start new unit
      currentUnit = unitMatch[1].trim();
      currentContent = [];
      
      // Add unit title if present
      if (unitMatch[2].trim()) {
        currentContent.push(unitMatch[2].trim());
      }    } else if (currentUnit && trimmedLine) {
      // Add content to current unit (but skip textbook sections)
      if (!trimmedLine.toLowerCase().includes('text book') && 
          !trimmedLine.toLowerCase().includes('reference book') &&
          !trimmedLine.toLowerCase().includes('modes of evaluation') &&
          !trimmedLine.toLowerCase().includes('examination scheme') &&
          !trimmedLine.toLowerCase().includes('relationship between') &&
          !trimmedLine.match(/^\d+\.\s*[A-Z]/) && // Skip numbered textbook entries
          !trimmedLine.includes('Edition') &&
          !trimmedLine.includes('McGraw-Hill') &&
          !trimmedLine.includes('Pearson') &&
          !trimmedLine.includes('Prentice Hall')) {
        currentContent.push(trimmedLine);
      }
    }
  }
  
  // Add the last unit
  if (currentUnit) {
    unitSections.push({
      header: currentUnit,
      content: currentContent.join('\n').trim()
    });
  }
  
  console.log(`📝 Found ${unitSections.length} units using proper parsing`);
    // Convert units to outline format
  const outline = unitSections.map((unit, index) => {
    // Enhanced unit matching to better handle Unit-I format
    const unitMatch = unit.header.match(/(Unit|MODULE?)[\s\-]*([IVX\d]+)/i);
    const unitType = unitMatch ? unitMatch[1] : 'Unit';
    const unitNum = unitMatch ? unitMatch[2] : String(index + 1);
    
    // Clean the content by removing lecture hours, textbook references, etc.
    let cleanContent = unit.content
      .replace(/\d+\s*Lecture\s*Hours?\s*/gi, '') // Remove lecture hours
      .replace(/Text\s*Books?:[\s\S]*$/i, '') // Remove textbook sections
      .replace(/Reference\s*Books?:[\s\S]*$/i, '') // Remove reference sections
      .replace(/\d+\.\s*Artificial Intelligence[\s\S]*$/i, '') // Remove numbered textbook entries
      .trim();
    
    // Extract topics from cleaned content
    const contentLines = cleanContent.split('\n').filter(line => {
      const trimmedLine = line.trim();
      return trimmedLine && 
             !trimmedLine.match(/^\d+\s*Lecture\s*Hours?/i) &&
             !trimmedLine.match(/^\d+\.\s*[A-Z]/) && // Remove numbered textbook entries
             !trimmedLine.includes('Edition') &&
             !trimmedLine.includes('McGraw-Hill') &&
             !trimmedLine.includes('Pearson') &&
             !trimmedLine.includes('Prentice Hall') &&
             trimmedLine.length > 5;
    });
    
    const topics = [];
      // Look for the main unit title (usually after the colon)
    let unitMainTitle = null;
    
    // First try to find a specific subject in the unit header itself
    const unitHeaderMatch = unit.header.match(/^Unit[\s\-]+[IVX\d]+[\s:]*([A-Za-z].*)/i);
    if (unitHeaderMatch && unitHeaderMatch[1] && unitHeaderMatch[1].trim().length > 3) {
      unitMainTitle = unitHeaderMatch[1].trim()
        .replace(/\s*\d+\s*Lecture\s*Hours?\s*/i, '')
        .replace(/\s*-?\s*\d+\s*Lecture\s*Hours?\s*/i, '')
        .replace(/\s*\d+\s*hours?\s*/i, '')
        .replace(/\s*-?\s*\d+\s*hours?\s*/i, '')
        .replace(/\s*\(\s*\d+\s*hours?\s*\)/i, '')
        .replace(/\s*\(\s*\d+\s*Lecture\s*Hours?\s*\)/i, '')
        .trim();
    }
    
    // If no title found in the header, look at the content
    if (!unitMainTitle && contentLines.length > 0) {
      const firstLine = contentLines[0].trim();
      // Clean lecture hours and other metadata from unit title
      let cleanTitle = firstLine
        .replace(/\s*\d+\s*Lecture\s*Hours?\s*/i, '')
        .replace(/\s*-?\s*\d+\s*Lecture\s*Hours?\s*/i, '')
        .replace(/\s*\d+\s*hours?\s*/i, '')
        .replace(/\s*-?\s*\d+\s*hours?\s*/i, '')
        .replace(/\s*\(\s*\d+\s*hours?\s*\)/i, '')
        .replace(/\s*\(\s*\d+\s*Lecture\s*Hours?\s*\)/i, '')
        .replace(/\s*\d+\s*marks?\s*/i, '')
        .replace(/\s*\d+\s*periods?\s*/i, '')
        .replace(/^[:\s,;-]+|[:\s,;-]+$/g, '') // Clean punctuation at start/end
        .trim();
      
      // If the title ends with a colon, it's likely a category label, not a title
      if (cleanTitle.endsWith(':')) {
        cleanTitle = cleanTitle.replace(/:$/, '');
      }

      // If the cleaned title is meaningful, use it
      if (cleanTitle && cleanTitle.length > 3 && 
          !cleanTitle.match(/^(and|or|the|of|in|for|with|by|to|from|on|at|as)/i)) {
        unitMainTitle = cleanTitle;
      }
    }
    
    // If we haven't found a good title yet, try the second line
    if ((!unitMainTitle || unitMainTitle === "Introduction") && contentLines.length > 1) {
      const secondLine = contentLines[1].trim();
      if (secondLine && secondLine.length > 3 && 
          !secondLine.match(/^(and|or|the|of|in|for|with|by|to|from|on|at|as)/i) &&
          !secondLine.endsWith(':')) {
        unitMainTitle = secondLine;
      }
    }
    
    // If still no good title found, use first meaningful phrase from content
    if (!unitMainTitle) {
      // Find first meaningful phrase in content
      for (const line of contentLines) {
        const cleanedLine = line.trim()
          .replace(/^[:\s,;-]+|[:\s,;-]+$/g, '') // Clean punctuation
          .replace(/\s*\d+\s*Lecture\s*Hours?\s*/i, '')
          .trim();
          
        if (cleanedLine.length > 5 && !cleanedLine.endsWith(':') && 
            !cleanedLine.match(/^(and|or|the|of|in|for|with|by|to|from|on|at|as)/i)) {
          unitMainTitle = cleanedLine;
          break;
        }
      }
    }
      // Default to unit name if no good title found
    if (!unitMainTitle) {
      unitMainTitle = `${unitType} ${unitNum}`;
    }
    
    // Extract topics from cleaned content
    const topicPatterns = [
      /(?:^|\n)(?:[•\-\*]|\d+\.)\s*([A-Za-z][^\n]+)/g, // Bullet points or numbered items
      /(?:^|\n)Unit\s*-\s*([IVX\d]+)\s*:\s*([^\n]+)/i, // Unit-X format
      /(?:^|\n)(?:Unit|Module)\s*([IVX\d]+)[\s:.-]*([^\n]+)/i, // Unit I, Module I formats
      /(?:^|\n)(?:Chapter|Topic)[:\s-]*([IVX\d]+)[:\s-]+(.+)/i // Chapter or Topic formats
    ];
    
    let extractedTopics = [];
    
    for (const pattern of topicPatterns) {
      const matches = cleanContent.match(pattern);
      if (matches) {
        extractedTopics = extractedTopics.concat(matches);
      }
    }
    
    // Clean and format extracted topics
    const formattedTopics = extractedTopics.map((topic, idx) => {
      // Clean lecture hours and other metadata
      let cleanTopic = topic
        .replace(/\s*\d+\s*Lecture\s*Hours?\s*/i, '')
        .replace(/\s*-?\s*\d+\s*Lecture\s*Hours?\s*/i, '')
        .replace(/\s*\d+\s*hours?\s*/i, '')
        .replace(/\s*-?\s*\d+\s*hours?\s*/i, '')
        .replace(/\s*\(\s*\d+\s*hours?\s*\)/i, '')
        .replace(/\s*\(\s*\d+\s*Lecture\s*Hours?\s*\)/i, '')
        .replace(/\s*\d+\s*marks?\s*/i, '')
        .replace(/\s*\d+\s*periods?\s*/i, '')
        .replace(/^[:\s,;-]+|[:\s,;-]+$/g, '') // Clean punctuation
        .trim();
      
      // If the topic is empty after cleaning, fallback to a default topic name
      if (!cleanTopic || cleanTopic.length < 3) {
        cleanTopic = `Topic ${idx + 1}`;
      }
      
      return cleanTopic;
    });
    
    // Limit to top 6 topics for the mind map
    const selectedTopics = formattedTopics.slice(0, 6);
    
    // Add as topics in the outline
    const unitTitle = unitMainTitle || `${unitType} ${unitNum}`;
    
    return {
      id: `unit_${index + 1}`,
      title: unitTitle,
      type: 'module',
      unitType: unitType,
      unitNumber: unitNum,
      content: cleanContent,
      topics: selectedTopics.map((title, idx) => ({
        id: `topic_${index + 1}_${idx + 1}`,
        title: title,
        content: `Details about ${title} within ${unitType} ${unitNum}.`
      }))
    };
  });
  console.log(`📘 Created ${outline.length} structured modules`);
  outline.forEach((module, index) => {
    console.log(`📘 Module ${index + 1}: ${module.title.substring(0, 50)}...`);
  });
  
  return outline;
};

// Detect if syllabus has tabular/structured format (like Geography example)
const detectTabularFormat = (syllabus) => {
  const indicators = [
    /unit\s*[\|\-\s]+chapter\s*[\|\-\s]+periods?\s*[\|\-\s]+weightage/i,
    /unit\s*[\|\-\s]+topic\s*[\|\-\s]+hours?\s*[\|\-\s]+marks?/i,
    /\|\s*unit\s*\|\s*chapter/i,
    /\|\s*topic\s*\|\s*periods?/i,
    /\|\s*module\s*\|\s*content/i,
    /unit\s+chapter\s+periods?\s+weightage/i,
    /unit\s+topics?\s+hours?\s+marks?/i,
    /(unit|chapter|topic|module)\s+[1-9][\.\):\-\s]+.+\s+[1-9]+[\s\%]/i,
  ];

  return indicators.some((pattern) => pattern.test(syllabus));
};

// Extract content from structured/tabular format
const extractStructuredContent = (syllabus) => {
  const lines = syllabus.split("\n");
  const structuredTopics = [];

  let currentUnit = null;
  let isInTableData = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip header rows and separators
    if (
      trimmedLine.includes("Unit") &&
      trimmedLine.includes("Chapter") &&
      (trimmedLine.includes("Periods") ||
        trimmedLine.includes("Hours") ||
        trimmedLine.includes("Weightage"))
    ) {
      isInTableData = true;
      continue;
    }

    if (trimmedLine.match(/^[\|\-\+\s]+$/)) {
      continue; // Skip separator lines
    }

    if (isInTableData && trimmedLine) {
      // Parse tabular data - handle various formats
      const unitChapterMatch = trimmedLine.match(
        /^[\|\s]*(?:unit\s*)?([1-9]+)[\.\)\|\s]+(.+?)[\|\s]+([1-9]+[\s\%]*)/i
      );
      const simpleTopicMatch = trimmedLine.match(
        /^[\|\s]*([^|\d]+?)[\|\s]+([1-9]+[\s\%]*)/i
      );      if (unitChapterMatch) {
        const [, unitNum, chapterContent, periods] = unitChapterMatch;
        let cleanContent = chapterContent.replace(/[\|\-]+/g, " ").trim();
          // Clean lecture hours from tabular content
        cleanContent = cleanContent
          .replace(/\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
          .replace(/\s*-\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
          .replace(/\s*,\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
          .replace(/\s*;\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
          .replace(/\s*\(\s*\d+\s*Lecture\s*Hours?\s*\)/i, "")
          .replace(/\s*[\-,;]\s*$/i, "")
          .trim();

        if (cleanContent && cleanContent.length > 3) {
          currentUnit = unitNum; // Store unit number for context
          structuredTopics.push(cleanContent); // Push only the clean content without unit prefix
        }
      } else if (simpleTopicMatch) {
        const [, topicContent, periods] = simpleTopicMatch;
        let cleanContent = topicContent.replace(/[\|\-]+/g, " ").trim();
          // Clean lecture hours from simple topic content
        cleanContent = cleanContent
          .replace(/\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
          .replace(/\s*-\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
          .replace(/\s*,\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
          .replace(/\s*;\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
          .replace(/\s*\(\s*\d+\s*Lecture\s*Hours?\s*\)/i, "")
          .replace(/\s*[\-,;]\s*$/i, "")
          .trim();if (
          cleanContent &&
          cleanContent.length > 3 &&
          !cleanContent.toLowerCase().includes("unit")
        ) {
          // Push only the clean content without unit prefix
          structuredTopics.push(cleanContent);
        }
      }
    }    // Also capture non-tabular unit descriptions
    const unitHeaderMatch = trimmedLine.match(
      /^unit[:\s-]*([1-9]+)[:\s-]+(.+)/i
    );
    if (unitHeaderMatch && !isInTableData) {
      const [, unitNum, unitTitle] = unitHeaderMatch;      // Clean lecture hours from unit titles
      let cleanTitle = unitTitle.trim()
        .replace(/\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
        .replace(/\s*-\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
        .replace(/\s*,\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
        .replace(/\s*;\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
        .replace(/\s*\(\s*\d+\s*Lecture\s*Hours?\s*\)/i, "")
        .replace(/\s*[\-,;]\s*$/i, "")
        .trim();
      if (cleanTitle.length > 3) {
        structuredTopics.push(cleanTitle); // Push only the clean title without unit prefix
      }
    }    // Capture chapter/topic entries
    const chapterMatch = trimmedLine.match(
      /^(?:chapter|topic)[:\s-]*([1-9]+)[:\s-]+(.+)/i
    );
    if (chapterMatch) {
      const [, chapterNum, chapterTitle] = chapterMatch;      // Clean lecture hours from chapter titles
      let cleanChapterTitle = chapterTitle.trim()
        .replace(/\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
        .replace(/\s*-\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
        .replace(/\s*,\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
        .replace(/\s*;\s*\d+\s*Lecture\s*Hours?\s*$/i, "")
        .replace(/\s*\(\s*\d+\s*Lecture\s*Hours?\s*\)/i, "")
        .replace(/\s*[\-,;]\s*$/i, "")
        .trim();
      if (cleanChapterTitle.length > 3) {
        structuredTopics.push(cleanChapterTitle); // Push only the clean title without chapter prefix
      }
    }
  }

  return structuredTopics.length > 0 ? structuredTopics.join("\n") : syllabus;
};

// Determine subject domain for intelligent content generation
const detectSubjectDomain = (subjectName, syllabusContent) => {
  const subjectLower = subjectName.toLowerCase();
  const contentLower = syllabusContent.toLowerCase();

  // Mathematics/Engineering domains (heavy equation usage)
  const mathDomains = [
    "mathematics",
    "calculus",
    "algebra",
    "statistics",
    "physics",
    "engineering",
    "mechanics",
    "thermodynamics",
    "electromagnetic",
    "quantum",
    "differential",
    "linear algebra",
    "numerical analysis",
  ];

  // Computer Science domains (code examples)
  const csDomains = [
    "computer science",
    "programming",
    "software",
    "algorithm",
    "data structure",
    "machine learning",
    "ai",
    "artificial intelligence",
    "neural networks",
    "deep learning",
    "reinforcement learning",
    "nlp",
    "natural language processing",
    "computer vision",
    "database",
    "network",
    "cybersecurity",
    "web development",
    "software engineering",
  ];

  // Science domains (moderate equations, more descriptions)
  const scienceDomains = [
    "chemistry",
    "biology",
    "biochemistry",
    "molecular",
    "genetics",
    "pharmacology",
    "anatomy",
    "physiology",
    "ecology",
    "botany",
    "zoology",
    "microbiology",
  ];

  // Business/Social domains (minimal equations, more concepts)
  const businessDomains = [
    "business",
    "management",
    "marketing",
    "finance",
    "economics",
    "accounting",
    "organizational",
    "strategic",
    "human resource",
    "psychology",
    "sociology",
    "political science",
    "history",
    "geography",
    "literature",
    "philosophy",
  ];

  if (
    mathDomains.some(
      (domain) => subjectLower.includes(domain) || contentLower.includes(domain)
    )
  ) {
    return "mathematics";
  }

  if (
    csDomains.some(
      (domain) => subjectLower.includes(domain) || contentLower.includes(domain)
    )
  ) {
    return "computer_science";
  }

  if (
    scienceDomains.some(
      (domain) => subjectLower.includes(domain) || contentLower.includes(domain)
    )
  ) {
    return "science";
  }

  if (
    businessDomains.some(
      (domain) => subjectLower.includes(domain) || contentLower.includes(domain)
    )
  ) {
    return "business";
  }

  return "general";
};

// Get intelligent guidelines for natural content generation
const getIntelligentGuidelines = (domain) => {
  const guidelines = {
    mathematics: `## MATHEMATICAL EXPERTISE GUIDELINES
Write with the authority of a mathematics professor who can explain complex concepts clearly. 
- Use precise mathematical language but make it accessible
- Include relevant equations naturally when they illuminate concepts
- Connect abstract mathematics to real-world applications
- Show the beauty and elegance of mathematical thinking
- Build concepts systematically from fundamentals to advanced topics`,

    computer_science: `## COMPUTER SCIENCE EXPERTISE GUIDELINES
Write as a senior software engineer and computer scientist with deep theoretical and practical knowledge.
- Balance theoretical computer science with practical programming insights
- Include code examples that illustrate important concepts clearly
- Explain algorithms and data structures with clarity and depth
- Connect academic concepts to industry practices and emerging technologies
- Emphasize problem-solving methodologies and computational thinking`,

    science: `## SCIENTIFIC EXPERTISE GUIDELINES
Write as a research scientist who understands both laboratory work and theoretical foundations.
- Use the scientific method as a framework for understanding
- Connect basic principles to cutting-edge research and applications
- Include relevant equations when they help explain natural phenomena
- Emphasize experimental validation and real-world evidence
- Show how scientific knowledge drives technological innovation`,

    business: `## BUSINESS EXPERTISE GUIDELINES
Write as an experienced business leader with academic grounding and practical experience.
- Focus on strategic thinking and practical implementation
- Use business frameworks naturally to organize thinking
- Include relevant financial calculations when they add insight
- Connect theoretical business concepts to real market dynamics
- Emphasize decision-making under uncertainty and competitive advantage`,

    general: `## ACADEMIC EXPERTISE GUIDELINES
Write as a distinguished scholar who makes complex subjects accessible and engaging.
- Adapt your communication style to the academic discipline
- Use appropriate technical language while remaining clear
- Connect theory to practice in meaningful ways
- Build understanding systematically and logically
- Inspire curiosity and deeper exploration of the subject`,
  };

  return guidelines[domain] || guidelines.general;
};

// Get domain-specific hints for intelligent content adaptation
const getDomainSpecificHints = (domain) => {
  const hints = {
    mathematics:
      "**Content Intelligence Hints:**\n- Include equations using KaTeX when they clarify concepts\n- Explain mathematical intuition behind formulas\n- Use proof techniques and mathematical reasoning\n- Connect pure mathematics to applied contexts\n- Show computational methods and problem-solving strategies",

    computer_science:
      "**Content Intelligence Hints:**\n- Include relevant code snippets that demonstrate concepts clearly\n- Explain algorithmic thinking and computational complexity\n- Balance theory with practice\n- Show how abstract CS concepts apply to real software systems\n- Include pseudocode for algorithms when helpful",

    science:
      "**Content Intelligence Hints:**\n- Use scientific equations judiciously when they illuminate principles\n- Emphasize experimental methods and empirical evidence\n- Connect basic scientific principles to current research\n- Include real-world applications and technological implications\n- Show how scientific knowledge evolves through discovery",

    business:
      "**Content Intelligence Hints:**\n- Include business metrics when relevant\n- Use strategic frameworks naturally\n- Focus on practical decision-making and real market dynamics\n- Include case study thinking and scenario analysis\n- Emphasize leadership, management, and organizational behavior",

    general:
      "**Content Intelligence Hints:**\n- Adapt your approach to the specific academic discipline\n- Use domain-appropriate technical language and concepts\n- Include relevant examples and applications from the field\n- Balance theoretical understanding with practical applications\n- Create content that builds knowledge systematically",
  };

  return hints[domain] || hints.general;
};

// Enhanced AI prompt generator - uses AI-parsed data
const generateMindMapPrompt = (subjectName, aiParsedData) => {
  // Use the AI-parsed data to create a focused prompt
  const topicsList = aiParsedData.main_topics.map((topic, index) => 
    `${index + 1}. ${topic.title}`
  ).join('\n');
  
  return `You are an expert educational content creator. Create a comprehensive mind map for the subject "${subjectName}".

MAIN TOPICS IDENTIFIED:
${topicsList}

Create a detailed mind map JSON with this structure:

{
  "title": "${subjectName}",
  "subject": "${subjectName}",
  "nodes": [
    {
      "id": "central",
      "label": "${subjectName}",
      "type": "root",
      "level": 0,
      "position": { "x": 400, "y": 300 },
      "content": "[300-400 word comprehensive overview of ${subjectName}]",
      "isRoot": true,
      "hasChildren": true,
      "children": ["topic1", "topic2", ...]
    },
    // Add topic nodes and subtopic nodes with detailed content
  ],
  "edges": [
    // Connect all nodes appropriately
  ]
}

Generate comprehensive, educational content for each node. Make it engaging and informative.

Return ONLY valid JSON.`;
};
// Set the port for the server
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
});