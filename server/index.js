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
const { transformGroqResponse } = require("./transform"); // Import the transform utility
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
      .json({ error: "Authentication error", details: error.message });
  }
};

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("Initializing Firebase Admin with service account");

    // Parse service account key string to JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized successfully");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      "Initializing Firebase Admin with application default credentials"
    );
    admin.initializeApp();
    console.log(
      "Firebase Admin initialized with application default credentials"
    );
  } else {
    console.warn(
      "Firebase service account not provided. Some authentication features may not work properly."
    );
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
}

// MongoDB connection
let client;
let db;

const connectToMongoDB = async () => {
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    db = client.db("adhyayanai");

    // Create indexes for improved query performance
    await db.collection("mindmaps").createIndex({ userId: 1 });
    await db.collection("mindmaps").createIndex({ title: "text" });
    await db.collection("users").createIndex({ uid: 1 }, { unique: true });

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

// Helper function to check database connection
const checkDbConnection = (req, res, next) => {
  if (!db) {
    return res
      .status(500)
      .json({ error: "Database connection not established" });
  }
  next();
};

// AUTHENTICATION ENDPOINTS

// Login with Firebase token and issue JWT
app.post("/api/login", async (req, res) => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ error: "Firebase token is required" });
    }

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    console.log("Firebase token verified:", decodedToken);

    // Create a JWT token with user info
    const jwtPayload = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      name: decodedToken.name || "",
      picture: decodedToken.picture || "",
    };

    // If MongoDB is connected, make sure the user exists in our database
    if (db) {
      const existingUser = await db
        .collection("users")
        .findOne({ uid: decodedToken.uid });

      if (!existingUser) {
        // Create new user record
        const newUser = {
          uid: decodedToken.uid,
          email: decodedToken.email || "",
          displayName: decodedToken.name || "",
          photoURL: decodedToken.picture || "",
          createdAt: new Date(),
          lastLogin: new Date(),
          settings: {
            theme: "light", // default settings
            notifications: true,
          },
        };

        await db.collection("users").insertOne(newUser);
        console.log("New user created in database:", decodedToken.uid);
      } else {
        // Update last login time
        await db
          .collection("users")
          .updateOne(
            { uid: decodedToken.uid },
            { $set: { lastLogin: new Date() } }
          );
        console.log("User login time updated:", decodedToken.uid);
      }
    }

    // Sign the JWT
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: "7d", // Token expires in 7 days
    });

    res.json({ token, user: jwtPayload });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ error: error.message });
  }
});

// Endpoint to get user profile
app.get("/api/user", verifyToken, checkDbConnection, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get user from database
    const user = await db.collection("users").findOne({ uid: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user data without sensitive information
    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      settings: user.settings || {},
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
});
// Endpoint to update user settings
app.patch("/api/user/settings", verifyToken, checkDbConnection, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        error: "Settings object is required",
      });
    }

    await db
      .collection("users")
      .updateOne({ uid: userId }, { $set: { settings } });

    res.json({
      success: true,
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Error updating user settings:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to update user settings",
      details: error.message,
    });
  }
});

// MIND MAP ENDPOINTS

// Endpoint to create a mind map
app.post("/api/mindmap/create", verifyToken, checkDbConnection, async (req, res) => {
  try {
    const { subjectName, prompt = "", options = {} } = req.body;

    if (!subjectName) {
      return res.status(400).json({
        success: false,
        error: "Subject name is required",
      });
    }

    console.log("Generating mind map for subject:", subjectName);
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an elite educational mind map creator with PhD-level expertise in academic curriculum design. Your mission is to create comprehensive, university-level mind maps that capture the complete breadth and depth of any academic subject.

ADVANCED MIND MAP INTELLIGENCE:
1. COMPREHENSIVE SUBJECT ANALYSIS: Understand the full scope of the subject, including core concepts, advanced topics, applications, and interconnections
2. INFINITE DEPTH CAPABILITY: Create hierarchical structures with unlimited nesting levels (subtopics → sub_subtopics → sub_sub_subtopics → etc.)
3. ACADEMIC RIGOR: Ensure university-level depth with proper theoretical foundations, methodologies, and applications
4. COMPLETE COVERAGE: Include ALL major areas of the subject - theoretical, practical, historical, and contemporary aspects
5. INTELLIGENT ORGANIZATION: Structure topics in logical learning progression with clear conceptual relationships

MIND MAP STRUCTURE REQUIREMENTS:
- Central node: Subject name with comprehensive academic overview
- Module nodes: 6-12 major topic areas covering the complete subject
- Subtopics: 4-8 subtopics per major topic with detailed content
- Deeper nesting: Add sub_subtopics, sub_sub_subtopics as needed for complex subjects
- Rich descriptions: Educational content for each node explaining key concepts

PERFECT JSON OUTPUT FORMAT:
{
  "mind_map": {
    "central_node": {
      "title": "Subject Name",
      "description": "Comprehensive academic overview covering scope and significance",
      "content": "Detailed description including key areas, methodologies, and applications"
    },
    "module_nodes": [
      {
        "title": "Major Topic Area 1",
        "content": "Comprehensive description of this topic area with key concepts",
        "subtopics": [
          {
            "title": "Important Subtopic",
            "content": "Detailed explanation of concepts and applications",
            "sub_subtopics": [
              {
                "title": "Specific Concept",
                "content": "Detailed technical description",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}

CRITICAL SUCCESS CRITERIA:
- Cover 100% of the subject's academic scope
- Include theoretical foundations, methodologies, and applications
- Create logical learning progression
- Provide rich, educational content descriptions
- Use proper academic terminology
- Structure for university-level learning
- Generate unlimited depth as needed for complex topics
- Output only valid JSON (no markdown or explanations)

Create the most comprehensive academic mind map possible for the subject.`,
        },
        {
          role: "user",
          content: `Create a comprehensive, university-level mind map for: "${subjectName}"
${prompt ? ` Additional requirements: ${prompt}` : ""}

Generate a complete academic mind map covering all major areas, theories, methods, and applications of this subject.`,
        },
      ],
      model: "llama3-70b-8192",
      temperature: 0.3,
      max_tokens: 8000,
      top_p: 0.9,
      stop: null,
    });

    console.log("LLM response received");
    let jsonResponseContent;
    try {
      const content = completion.choices[0]?.message?.content || "";
      console.log("Raw response length:", content.length);

      let jsonText = content;
      const jsonBlockMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonText = jsonBlockMatch[1];
      }

      try {
        jsonResponseContent = JSON.parse(jsonText);
        console.log("JSON parsed successfully on first attempt");
      } catch (parseError) {
        console.log("First parse attempt failed, trying to fix JSON");
        const fixedJson = fixBrokenJSON(jsonText);
        jsonResponseContent = JSON.parse(fixedJson);
        console.log("Fixed JSON parsed successfully");
      }
    } catch (error) {
      console.error("JSON parsing failed:", error.message);
      return res.status(500).json({
        success: false,
        error: "Failed to parse mind map data",
        details: error.message,
      });
    }

    const transformedData = transformGroqResponse(jsonResponseContent, subjectName);
    const userId = req.user.uid;

    let result;
    if (db) {
      result = await db.collection("mindmaps").insertOne({
        userId: userId,
        title: subjectName,
        data: transformedData,
        createdAt: new Date(),
        lastModified: new Date(),
        prompt: prompt || "",
        options: options || {},
      });
      console.log(`Mind map saved to database with ID: ${result.insertedId}`);
    }

    res.status(201).json({
      success: true,
      message: "Mind map created successfully",
      mindMapId: result?.insertedId || null,
      data: transformedData,
    });
  } catch (error) {
    console.error("Error creating mind map:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to create mind map",
      details: error.message,
    });
  }
});

// Endpoint to get a mind map by ID
app.get("/api/mindmap/:id", verifyToken, checkDbConnection, async (req, res) => {
  try {
    const mindMapId = req.params.id;

    if (!ObjectId.isValid(mindMapId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid mind map ID format",
      });
    }

    const mindMap = await db.collection("mindmaps").findOne({
      _id: new ObjectId(mindMapId),
    });

    if (!mindMap) {
      return res.status(404).json({
        success: false,
        error: "Mind map not found",
      });
    }

    const userId = req.user.uid;
    if (mindMap.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    res.json({
      success: true,
      mindMap: {
        id: mindMap._id,
        title: mindMap.title,
        data: mindMap.data,
        createdAt: mindMap.createdAt,
        lastModified: mindMap.lastModified,
      },
    });
  } catch (error) {
    console.error("Error retrieving mind map:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve mind map",
      details: error.message,
    });
  }
});

// Endpoint to get all mind maps for a user
app.get("/api/mindmap/list", verifyToken, checkDbConnection, async (req, res) => {
  try {
    const userId = req.user.uid;

    const mindMaps = await db
      .collection("mindmaps")
      .find({ userId })
      .sort({ lastModified: -1 })
      .project({
        title: 1,
        createdAt: 1,
        lastModified: 1,
      })
      .toArray();

    res.json({
      success: true,
      mindMaps: mindMaps.map((map) => ({
        id: map._id,
        title: map.title,
        createdAt: map.createdAt,
        lastModified: map.lastModified,
      })),
    });
  } catch (error) {
    console.error("Error retrieving mind maps:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve mind maps",
      details: error.message,
    });
  }
});

// Endpoint to delete a mind map
app.delete("/api/mindmap/:id", verifyToken, checkDbConnection, async (req, res) => {
  try {
    const mindMapId = req.params.id;

    if (!ObjectId.isValid(mindMapId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid mind map ID format",
      });
    }

    const mindMap = await db.collection("mindmaps").findOne({
      _id: new ObjectId(mindMapId),
    });

    if (!mindMap) {
      return res.status(404).json({
        success: false,
        error: "Mind map not found",
      });
    }

    const userId = req.user.uid;
    if (mindMap.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    await db.collection("mindmaps").deleteOne({
      _id: new ObjectId(mindMapId),
    });

    res.json({
      success: true,
      message: "Mind map deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting mind map:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to delete mind map",
      details: error.message,
    });
  }
});

// Endpoint to parse a document and create a mind map
app.post("/api/mindmap/parse-document", verifyToken, upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No document uploaded",
      });
    }

    const { subjectName } = req.body;
    if (!subjectName) {
      return res.status(400).json({
        success: false,
        error: "Subject name is required",
      });
    }

    console.log("Parsing document of type:", req.file.mimetype);
    let documentText = "";

    if (req.file.mimetype === "application/pdf") {
      const pdfData = await pdfParse(req.file.buffer);
      documentText = pdfData.text;
    } else if (req.file.mimetype.includes("word")) {
      const result = await mammoth.extractRawText({
        buffer: req.file.buffer,
      });
      documentText = result.value;
    } else if (req.file.mimetype.includes("image")) {
      const img = await sharp(req.file.buffer).toBuffer();
      const { data } = await tesseract.recognize(img, "eng");
      documentText = data.text;
    } else {
      documentText = req.file.buffer.toString("utf8");
    }

    if (!documentText || documentText.length < 50) {
      return res.status(400).json({
        success: false,
        error: "Could not extract sufficient text from the document",
      });
    }

    console.log(`Extracted ${documentText.length} characters of text`);
    const maxLength = 15000;
    const trimmedText =
      documentText.length > maxLength
        ? documentText.slice(0, maxLength) + "... [Text truncated due to length]"
        : documentText;

    const completion = await parsingGroq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an elite educational document analysis specialist with expertise in extracting comprehensive learning structures from any academic content. Your mission is to analyze documents and create detailed mind maps that capture every educational concept and relationship.

ADVANCED DOCUMENT ANALYSIS INTELLIGENCE:
1. COMPLETE CONTENT EXTRACTION: Identify and extract every educational concept, theory, method, and detail from the document
2. INTELLIGENT STRUCTURE RECOGNITION: Understand document organization through headings, sections, paragraphs, and content flow
3. HIERARCHICAL RELATIONSHIP MAPPING: Create proper hierarchical relationships between main topics, subtopics, and detailed concepts
4. INFINITE DEPTH PROCESSING: Extract content to unlimited depth levels as present in the document
5. CONTEXTUAL UNDERSTANDING: Understand implicit relationships and group related concepts intelligently

DOCUMENT PROCESSING REQUIREMENTS:
- Extract main topics from document sections/chapters
- Identify all subtopics within each main topic
- Create sub_subtopics for detailed concepts
- Continue nesting deeper as document content requires
- Use actual content from document for descriptions
- Preserve educational value and learning objectives
- Clean and organize content for optimal learning

PERFECT JSON OUTPUT FORMAT:
{
  "mind_map": {
    "central_node": {
      "title": "Subject Name",
      "description": "Comprehensive overview extracted from document",
      "content": "Detailed description covering key concepts from document content"
    },
    "module_nodes": [
      {
        "title": "Main Topic from Document",
        "content": "Rich description extracted from document text",
        "subtopics": [
          {
            "title": "Subtopic from Document",
            "content": "Detailed content from document",
            "sub_subtopics": [
              {
                "title": "Specific Concept",
                "content": "Detailed explanation from document",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}

CRITICAL SUCCESS CRITERIA:
- Extract 100% of educational content from document
- Create proper hierarchical learning structure
- Use actual document content in descriptions
- Organize for optimal educational value
- Handle any document structure or format
- Generate unlimited depth as needed
- Output only valid JSON (no markdown or explanations)
- Preserve all educational relationships and context

Transform the complete document into a comprehensive learning mind map.`,
        },
        {
          role: "user",
          content: `Analyze this complete document and create a comprehensive mind map for "${subjectName}" extracting ALL educational content:

${trimmedText}`,
        },
      ],
      model: "llama3-70b-8192",
      temperature: 0.2,
      max_tokens: 8000,
      top_p: 0.9,
      stop: null,
    });

    console.log("Document parsing response received");
    let jsonResponseContent;
    try {
      const content = completion.choices[0]?.message?.content || "";
      console.log("Raw response length:", content.length);

      let jsonText = content;
      const jsonBlockMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonText = jsonBlockMatch[1];
      }

      try {
        jsonResponseContent = JSON.parse(jsonText);
        console.log("JSON parsed successfully on first attempt");
      } catch (parseError) {
        console.log("First parse attempt failed, trying to fix JSON");
        const fixedJson = fixBrokenJSON(jsonText);
        jsonResponseContent = JSON.parse(fixedJson);
        console.log("Fixed JSON parsed successfully");
      }
    } catch (error) {
      console.error("JSON parsing failed:", error.message);
      return res.status(500).json({
        success: false,
        error: "Failed to parse document content",
        details: error.message,
      });
    }

    const transformedData = transformGroqResponse(jsonResponseContent, subjectName);
    const userId = req.user.uid;

    let mindMapId = null;
    if (db) {
      const result = await db.collection("mindmaps").insertOne({
        userId: userId,
        title: subjectName,
        sourceType: "document",
        sourceFileName: req.file.originalname,
        data: transformedData,
        createdAt: new Date(),
        lastModified: new Date(),
      });
      mindMapId = result.insertedId;
      console.log(`Document-based mind map saved to database with ID: ${mindMapId}`);
    }

    res.status(201).json({
      success: true,
      message: "Document parsed and mind map created successfully",
      mindMapId: mindMapId,
      data: transformedData,
    });
  } catch (error) {
    console.error("Error parsing document:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to parse document",
      details: error.message,
    });
  }
});

// Mind Map Generation Endpoint
app.post("/api/mindmap/generate", verifyToken, async (req, res) => {
  try {
    const { subjectName, syllabus } = req.body;

    if (!subjectName) {
      return res.status(400).json({
        success: false,
        error: "Subject name is required",
      });
    }

    if (!syllabus) {
      return res.status(400).json({
        success: false,
        error: "Syllabus content is required",
      });
    }

    console.log(`Generating mind map for subject: ${subjectName}`);
    console.log(`Syllabus length: ${syllabus.length} characters`);

    let parsingCompletion;
    try {
     parsingCompletion = await parsingGroq.chat.completions.create({
  messages: [
    {
      role: "system",
      content: `You are the ULTIMATE syllabus parsing AI, engineered to extract EVERY detail from ANY academic syllabus with INFINITE hierarchical depth and produce PERFECT JSON output. Your mission is to analyze the syllabus, identify all structural components (units, modules, chapters, topics, subtopics, etc.), and create a comprehensive, learner-focused JSON structure that captures 100% of the educational content with precise nesting and rich descriptions.

---

### CORE OBJECTIVES
1. **Complete Extraction**: Capture every main topic, subtopic, sub-subtopic, and deeper levels (infinite depth) from the syllabus.
2. **Intelligent Structure Recognition**: Identify units, modules, chapters, or topic lists, and group related content logically, even in mixed or unstructured formats.
3. **Clean Titles**: Remove administrative clutter (e.g., "Unit-I", "Module 1", hours, codes) to create learner-friendly topic names.
4. **Rich Descriptions**: Generate concise, educational descriptions for each node based on syllabus content and context.
5. **Perfect JSON**: Output valid JSON with proper syntax, double-quoted keys/values, correct commas, no trailing commas, and escaped quotes.

---

### JSON OUTPUT STRUCTURE
{
  "parsed_structure": {
    "main_subject": {
      "title": "Complete Subject Name",
      "description": "Comprehensive overview of the subject, including scope, objectives, and key areas"
    },
    "units": [
      {
        "title": "Clean Main Topic Title",
        "description": "Educational description of this main topic, summarizing its content and purpose",
        "subtopics": [
          {
            "title": "Subtopic Title",
            "description": "Detailed explanation of this subtopic, including key concepts",
            "sub_subtopics": [
              {
                "title": "Sub-Subtopic Title",
                "description": "In-depth explanation of this concept",
                "sub_sub_subtopics": [
                  {
                    "title": "Deeper Concept Title",
                    "description": "Specific details of this concept",
                    "sub_sub_sub_subtopics": []
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}

---

### SYLLABUS PROCESSING RULES
1. **Identify Main Subject**: Extract the subject name from the syllabus title or course code (e.g., "Object Oriented Programming" from "CSE11109 Object Oriented Programming").
2. **Detect Structure**:
   - **Unit-Based**: Extract "Unit-I", "Unit-II", etc., as main topics.
   - **Module-Based**: Identify "Module 1", "Module 2", etc.
   - **Chapter-Based**: Recognize "Chapter 1", "Chapter 2", etc.
   - **Topic-Based**: Group listed topics into logical units if no explicit units/modules.
   - **Mixed Formats**: Combine units, modules, and topics intelligently, preserving hierarchy.
3. **Extract Hierarchy**:
   - Main topics → units array.
   - Subtopics → subtopics array within each unit.
   - Sub-subtopics → sub_subtopics array, and continue nesting infinitely (sub_sub_subtopics, etc.).
4. **Clean Titles**:
   - Remove prefixes (e.g., "Unit-I" → "OOP Concepts", "Module 1:" → "Introduction").
   - Strip hours, codes, or administrative text (e.g., "09 Lecture Hours").
5. **Generate Descriptions**:
   - Use syllabus content for descriptions.
   - Enhance with educational context (e.g., explain why a topic is important).
   - Keep descriptions concise yet informative.
6. **Handle Edge Cases**:
   - Unstructured syllabi: Group related topics logically.
   - Missing details: Infer context from course objectives or description.
   - Long lists: Break into subtopics for readability.

---

### JSON VALIDATION RULES
1. Every \`{\` must have a matching \`}\`.
2. Every \`[\` must have a matching \`]\`.
3. All property names and string values MUST be double-quoted (e.g., "title": "Value").
4. Commas required between array items and object properties, EXCEPT after the last item.
5. Escape quotes in strings (e.g., "Text with \\"quotes\\"").
6. Validate bracket balance before output.
7. Ensure no trailing commas or syntax errors.

---

### EXAMPLE INPUT 1: UNIT-BASED SYLLABUS (Object Oriented Programming)
**Input Syllabus:**
\`\`\`
CSE11109 Object Oriented Programming L T P C
Version 1.0 Contact Hours 45 3 0 0 3
Course Description:
This course investigates object-oriented methods including object-oriented programming methodologies and techniques...
Course Content:
Unit-I 09 Lecture Hours
OOP Concepts - Data Abstraction, Encapsulation, Inheritance, Benefits of Inheritance, Polymorphism, Classes and Objects...
Unit-II 09 Lecture Hours
Exception Handling - Dealing With Errors, Advantages Of Exception Handling...
Multithreading - Difference Between Multiple Processes And Multiple Threads...
Unit-III 09 Lecture Hours
Collection Framework - Introduction, Generics and Common Use Of Collection Classes...
Files - Streams - Byte Streams, Character Streams...
Connecting To Database JDBC / ODBC Type 1 To 4 Drivers...
Unit-IV 09 Lecture Hours
GUI Programming - The AWT Class Hierarchy, Introduction To Swing...
Event Handling - Events, Sources, Classes, Listeners...
Applets - Inheritance Hierarchy For Applets...
Unit-V 09 Lecture Hours
Application Development: Design of real life GUI applications using Swing/AWT/JDBC...
\`\`\`

**Expected Output:**
\`\`\`json
{
  "parsed_structure": {
    "main_subject": {
      "title": "Object Oriented Programming",
      "description": "Comprehensive study of object-oriented programming methodologies, including encapsulation, inheritance, polymorphism, exception handling, multithreading, GUI development, and database connectivity using Java"
    },
    "units": [
      {
        "title": "OOP Fundamentals",
        "description": "Introduction to core object-oriented programming concepts and basic Java programming constructs",
        "subtopics": [
          {
            "title": "OOP Concepts",
            "description": "Fundamental principles including data abstraction, encapsulation, inheritance, and polymorphism",
            "sub_subtopics": [
              {
                "title": "Data Abstraction",
                "description": "Hiding implementation details and showing only essential features",
                "sub_sub_subtopics": []
              },
              {
                "title": "Encapsulation",
                "description": "Bundling data and methods within a class to protect object integrity",
                "sub_sub_subtopics": []
              }
            ]
          },
          {
            "title": "Java Basics",
            "description": "Core Java programming constructs including data types, variables, and control flow",
            "sub_subtopics": [
              {
                "title": "Data Types and Variables",
                "description": "Primitive and reference types, variable scope, and constants",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      },
      {
        "title": "Exception Handling and Multithreading",
        "description": "Techniques for robust error handling and concurrent programming in Java",
        "subtopics": [
          {
            "title": "Exception Handling",
            "description": "Mechanisms to handle runtime errors using try, catch, throw, and finally",
            "sub_subtopics": [
              {
                "title": "Exception Hierarchy",
                "description": "Checked and unchecked exceptions and their classifications",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\`

---

### EXAMPLE INPUT 2: MIXED SYLLABUS (Data Structures)
**Input Syllabus:**
\`\`\`
CS101 Data Structures
Module 1: Introduction
- Overview of Data Structures
- Types: Linear vs Non-Linear
Chapter 2: Arrays
- Array Operations
- Multi-dimensional Arrays
Topic List:
- Stacks: LIFO, Operations
- Queues: FIFO, Circular Queues
\`\`\`

**Expected Output:**
\`\`\`json
{
  "parsed_structure": {
    "main_subject": {
      "title": "Data Structures",
      "description": "Study of fundamental data organization techniques for efficient computation"
    },
    "units": [
      {
        "title": "Introduction",
        "description": "Overview of data structures and their classifications",
        "subtopics": [
          {
            "title": "Overview",
            "description": "Introduction to data structures and their importance",
            "sub_subtopics": []
          },
          {
            "title": "Types",
            "description": "Linear vs non-linear data structures",
            "sub_subtopics": []
          }
        ]
      },
      {
        "title": "Arrays",
        "description": "Contiguous memory structures for data storage",
        "subtopics": [
          {
            "title": "Array Operations",
            "description": "Insertion, deletion, and traversal operations",
            "sub_subtopics": []
          }
        ]
      },
      {
        "title": "Stacks and Queues",
        "description": "Linear data structures with specific access patterns",
        "subtopics": [
          {
            "title": "Stacks",
            "description": "Last-In-First-Out (LIFO) data structure",
            "sub_subtopics": []
          }
        ]
      }
    ]
  }
}
\`\`\`

---

### CRITICAL SUCCESS CRITERIA
- Extract 100% of syllabus content, including all topics and subtopics.
- Create a logical, hierarchical structure with infinite nesting depth.
- Generate clean, learner-friendly titles and educational descriptions.
- Produce perfect JSON syntax with no errors.
- Handle any syllabus format (unit-based, module-based, topic-based, mixed).
- Validate JSON structure before output to ensure bracket balance and syntax.

---

**OUTPUT INSTRUCTIONS**:
- Respond with valid JSON only, starting with \`{\` and ending with \`}\`.
- Do NOT include markdown, code blocks (\`\`\`json), or explanations.
- Ensure all content is extracted and hierarchically organized.`,
    },
    {
      role: "user",
      content: `TASK: Parse this syllabus into PERFECT JSON structure.
SUBJECT: "${subjectName}"
OUTPUT: Only valid JSON starting with { and ending with }
NO CODE BLOCKS, NO EXPLANATIONS, NO MARKDOWN

SYLLABUS:
${syllabus}

RESPOND WITH VALID JSON ONLY:`,
    },
  ],
  model: "llama3-70b-8192",
  temperature: 0.05,
  max_tokens: 8000,
  top_p: 0.85,
  stop: null,
});
    } catch (parsingError) {
      console.error("Error from parsing API:", parsingError.message);
      return res.status(500).json({
        success: false,
        error: "Failed to parse syllabus with AI agent",
        details: parsingError.message,
      });
    }

    let parsedStructure;
    try {
      const content = parsingCompletion.choices[0]?.message?.content || "";
      console.log("Raw parser response length:", content.length);

      let jsonText = content;
      const jsonBlockMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonText = jsonBlockMatch[1];
      }

      try {
        parsedStructure = JSON.parse(jsonText);
        console.log("Parsed structure JSON parsed successfully on first attempt");
      } catch (parseError) {
        console.log("First parse attempt failed, trying to fix JSON");
        const fixedJson = fixBrokenJSON(jsonText);
        parsedStructure = JSON.parse(fixedJson);
        console.log("Fixed parsed structure JSON successfully");
      }

      if (!parsedStructure.parsed_structure) {
        if (parsedStructure.main_subject || parsedStructure.units) {
          parsedStructure = { parsed_structure: parsedStructure };
        } else {
          throw new Error("Invalid parsed structure format - missing expected keys");
        }
      }
    } catch (error) {
      console.error("Syllabus parsing failed:", error.message);
      return res.status(500).json({
        success: false,
        error: "Failed to parse syllabus",
        details: error.message,
      });
    }

    console.log("Generating mind map from parsed structure...");
    let mindMapCompletion;
    try {
      mindMapCompletion = await groq.chat.completions.create({
  messages: [
    {
      role: "system",
      content: `You are the ULTIMATE mind map creation AI, designed to transform ANY parsed syllabus structure into a FLAWLESS, COMPREHENSIVE mind map JSON with INFINITE hierarchical depth. Your mission is to convert the parsed structure into a learner-focused mind map that preserves 100% of the content, enhances educational value with rich descriptions, and maintains perfect JSON syntax.

---

### CORE OBJECTIVES
1. **Complete Transformation**: Map every element from the parsed structure (main subject, units, subtopics, etc.) to the mind map format.
2. **Hierarchical Preservation**: Maintain exact nesting (units → subtopics → sub_subtopics → infinite depth).
3. **Educational Enhancement**: Generate detailed, learner-friendly descriptions that combine original content with context, applications, and learning objectives.
4. **Clean Titles**: Ensure titles are concise and optimized for learning.
5. **Perfect JSON**: Output valid JSON with double-quoted keys/values, correct commas, no trailing commas, and escaped quotes.

---

### JSON OUTPUT STRUCTURE
{
  "mind_map": {
    "central_node": {
      "title": "Subject Name from parsed_structure.main_subject.title",
      "description": "Use parsed_structure.main_subject.description",
      "content": "Enhanced overview combining description with learning objectives, scope, and practical applications"
    },
    "module_nodes": [
      {
        "title": "Clean Title from parsed_structure.units[i].title",
        "content": "Rich educational description combining unit description with learning objectives and context",
        "subtopics": [
          {
            "title": "Subtopic from parsed_structure.units[i].subtopics[j].title",
            "content": "Detailed explanation of this subtopic, including importance and applications",
            "sub_subtopics": [
              {
                "title": "Sub-subtopic from parsed_structure.units[i].subtopics[j].sub_subtopics[k].title",
                "content": "In-depth explanation with theoretical foundations and practical examples",
                "sub_sub_subtopics": [
                  {
                    "title": "Deeper Concept Title",
                    "content": "Comprehensive details with connections to broader subject",
                    "sub_sub_sub_subtopics": []
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}

---

### TRANSFORMATION RULES
1. **Map Main Subject**:
   - \`parsed_structure.main_subject.title\` → \`mind_map.central_node.title\`.
   - \`parsed_structure.main_subject.description\` → \`mind_map.central_node.description\`.
   - Enhance \`central_node.content\` with learning objectives, scope, and applications.
2. **Map Units**:
   - Each \`parsed_structure.units[i]\` → \`mind_map.module_nodes[i]\`.
   - Use \`units[i].title\` for \`module_nodes[i].title\`, keeping it clean.
   - Enhance \`module_nodes[i].content\` with educational context and objectives.
3. **Map Subtopics**:
   - \`units[i].subtopics[j]\` → \`module_nodes[i].subtopics[j]\`.
   - Preserve all deeper levels (\`sub_subtopics\`, \`sub_sub_subtopics\`, etc.).
   - Generate detailed \`content\` for each subtopic, including importance and applications.
4. **Infinite Depth**:
   - Continue mapping deeper hierarchies (e.g., \`sub_sub_subtopics\` → \`sub_sub_subtopics\).
   - Ensure no content is omitted, regardless of nesting level.
5. **Content Enhancement**:
   - Combine original descriptions with:
     - Why the topic is important.
     - Practical applications or examples.
     - Connections to other topics or the broader subject.
   - Keep descriptions academic yet accessible.
6. **Handle Edge Cases**:
   - Empty subtopics: Include empty arrays (\`[]\`) for consistency.
   - Missing descriptions: Generate based on title and context.
   - Long descriptions: Summarize while preserving key details.

---

### JSON VALIDATION RULES
1. Every \`{\` must have a matching \`}\`.
2. Every \`[\` must have a matching \`]\`.
3. All property names and string values MUST be double-quoted.
4. Commas required between array items and object properties, EXCEPT after the last item.
5. Escape quotes in strings (e.g., "Text with \\"quotes\\"").
6. Validate bracket balance before output.
7. Ensure no trailing commas or syntax errors.

---

### EXAMPLE INPUT 1: PARSED STRUCTURE (Object Oriented Programming)
**Input Parsed Structure:**
\`\`\`json
{
  "parsed_structure": {
    "main_subject": {
      "title": "Object Oriented Programming",
      "description": "Comprehensive study of object-oriented programming methodologies, including encapsulation, inheritance, polymorphism, exception handling, multithreading, GUI development, and database connectivity using Java"
    },
    "units": [
      {
        "title": "OOP Fundamentals",
        "description": "Introduction to core object-oriented programming concepts and basic Java programming constructs",
        "subtopics": [
          {
            "title": "OOP Concepts",
            "description": "Fundamental principles including data abstraction, encapsulation, inheritance, and polymorphism",
            "sub_subtopics": [
              {
                "title": "Data Abstraction",
                "description": "Hiding implementation details and showing only essential features",
                "sub_sub_subtopics": []
              },
              {
                "title": "Encapsulation",
                "description": "Bundling data and methods within a class to protect object integrity",
                "sub_sub_subtopics": []
              }
            ]
          },
          {
            "title": "Java Basics",
            "description": "Core Java programming constructs including data types, variables, and control flow",
            "sub_subtopics": [
              {
                "title": "Data Types and Variables",
                "description": "Primitive and reference types, variable scope, and constants",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      },
      {
        "title": "Exception Handling and Multithreading",
        "description": "Techniques for robust error handling and concurrent programming in Java",
        "subtopics": [
          {
            "title": "Exception Handling",
            "description": "Mechanisms to handle runtime errors using try, catch, throw, and finally",
            "sub_subtopics": [
              {
                "title": "Exception Hierarchy",
                "description": "Checked and unchecked exceptions and their classifications",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\`

**Expected Output:**
\`\`\`json
{
  "mind_map": {
    "central_node": {
      "title": "Object Oriented Programming",
      "description": "Comprehensive study of object-oriented programming methodologies, including encapsulation, inheritance, polymorphism, exception handling, multithreading, GUI development, and database connectivity using Java",
      "content": "Object Oriented Programming (OOP) is a paradigm that organizes software design around objects and classes. This course covers core OOP principles, Java programming techniques, and advanced features like multithreading, exception handling, GUI development, and database connectivity. Students will learn to design robust, scalable applications for real-world problems."
    },
    "module_nodes": [
      {
        "title": "OOP Fundamentals",
        "content": "Introduces the foundational concepts of object-oriented programming and essential Java constructs, enabling students to build modular and reusable code",
        "subtopics": [
          {
            "title": "OOP Concepts",
            "content": "Core principles that define OOP, including data abstraction, encapsulation, inheritance, and polymorphism, essential for designing flexible software systems",
            "sub_subtopics": [
              {
                "title": "Data Abstraction",
                "content": "Hiding complex implementation details to expose only necessary features, simplifying system design and maintenance",
                "sub_sub_subtopics": []
              },
              {
                "title": "Encapsulation",
                "content": "Protecting object data by bundling it with methods, ensuring data integrity and modularity, as seen in Java classes",
                "sub_sub_subtopics": []
              }
            ]
          },
          {
            "title": "Java Basics",
            "content": "Fundamental Java programming elements, including data types, variables, and control structures, critical for writing effective Java applications",
            "sub_subtopics": [
              {
                "title": "Data Types and Variables",
                "content": "Understanding Java's primitive and reference types, variable scope, and constants, foundational for all Java programming tasks",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      },
      {
        "title": "Exception Handling and Multithreading",
        "content": "Advanced Java techniques for handling errors and enabling concurrent execution, crucial for building robust and responsive applications",
        "subtopics": [
          {
            "title": "Exception Handling",
            "content": "Mechanisms to manage runtime errors, ensuring application stability using try, catch, throw, and finally blocks",
            "sub_subtopics": [
              {
                "title": "Exception Hierarchy",
                "content": "Structure of Java's exception classes, distinguishing between checked and unchecked exceptions for effective error management",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\`

---

### EXAMPLE INPUT 2: PARSED STRUCTURE (Data Structures)
**Input Parsed Structure:**
\`\`\`json
{
  "parsed_structure": {
    "main_subject": {
      "title": "Data Structures",
      "description": "Study of fundamental data organization techniques for efficient computation"
    },
    "units": [
      {
        "title": "Introduction",
        "description": "Overview of data structures and their classifications",
        "subtopics": [
          {
            "title": "Overview",
            "description": "Introduction to data structures and their importance",
            "sub_subtopics": []
          },
          {
            "title": "Types",
            "description": "Linear vs non-linear data structures",
            "sub_subtopics": []
          }
        ]
      },
      {
        "title": "Arrays",
        "description": "Contiguous memory structures for data storage",
        "subtopics": [
          {
            "title": "Array Operations",
            "description": "Insertion, deletion, and traversal operations",
            "sub_subtopics": []
          }
        ]
      }
    ]
  }
}
\`\`\`

**Expected Output:**
\`\`\`json
{
  "mind_map": {
    "central_node": {
      "title": "Data Structures",
      "description": "Study of fundamental data organization techniques for efficient computation",
      "content": "Data Structures is a core computer science discipline focused on organizing data for efficient storage, retrieval, and manipulation. This course covers linear and non-linear structures, their operations, and applications in solving computational problems."
    },
    "module_nodes": [
      {
        "title": "Introduction",
        "content": "Foundational overview of data structures, their types, and significance in algorithm design and software development",
        "subtopics": [
          {
            "title": "Overview",
            "content": "Introduction to the role of data structures in optimizing computational tasks and their impact on program efficiency",
            "sub_subtopics": []
          },
          {
            "title": "Types",
            "content": "Classification of data structures into linear (e.g., arrays, lists) and non-linear (e.g., trees, graphs) categories",
            "sub_sub_subtopics": []
          }
        ]
      },
      {
        "title": "Arrays",
        "content": "Study of arrays as fundamental data structures for sequential data storage with efficient random access",
        "subtopics": [
          {
            "title": "Array Operations",
            "content": "Core operations like insertion, deletion, and traversal, with analysis of their time complexities and practical applications",
            "sub_subtopics": []
          }
        ]
      }
    ]
  }
}
\`\`\`

---

### CRITICAL SUCCESS CRITERIA
- Transform 100% of parsed structure content into mind map format.
- Preserve exact hierarchical relationships and infinite nesting depth.
- Generate enhanced, educational descriptions for all nodes.
- Produce clean, learner-friendly titles and content.
- Output perfect JSON syntax with no errors.
- Include practical applications and connections to the broader subject.

---

**OUTPUT INSTRUCTIONS**:
- Respond with valid JSON only, starting with \`{\` and ending with \`}\`.
- Do NOT include markdown, code blocks (\`\`\`json), or explanations.
- Ensure all content is transformed and hierarchically organized.`,
    },
    {
      role: "user",
      content: `Please transform this parsed syllabus structure into a perfect mind map:

${JSON.stringify(parsedStructure)}

RESPOND WITH VALID MIND MAP JSON ONLY:`,
    },
  ],
  model: "llama3-70b-8192",
  temperature: 0.05,
  max_tokens: 8000,
  top_p: 0.85,
  stop: null,
});
    } catch (mindMapError) {
      console.error("Error from mind map creation API:", mindMapError.message);
      return res.status(500).json({
        success: false,
        error: "Failed to create mind map from parsed structure",
        details: mindMapError.message,
      });
    }

    let mindMapData;
    try {
      const content = mindMapCompletion.choices[0]?.message?.content || "";
      console.log("Raw mind map response length:", content.length);

      let jsonText = content;
      const jsonBlockMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonText = jsonBlockMatch[1];
      }

      try {
        mindMapData = JSON.parse(jsonText);
        console.log("Mind map JSON parsed successfully on first attempt");
      } catch (parseError) {
        console.log("First parse attempt failed, trying to fix JSON");
        const fixedJson = fixBrokenJSON(jsonText);
        mindMapData = JSON.parse(fixedJson);
        console.log("Fixed mind map JSON successfully");
      }

      if (!mindMapData.mind_map) {
        throw new Error("Invalid mind map format - missing 'mind_map' key");
      }
      if (!mindMapData.mind_map.central_node) {
        throw new Error("Invalid mind map format - missing 'central_node'");
      }
      if (!Array.isArray(mindMapData.mind_map.module_nodes)) {
        throw new Error("Invalid mind map format - 'module_nodes' is not an array");
      }
    } catch (error) {
      console.error("Mind map creation failed:", error.message);
      return res.status(500).json({
        success: false,
        error: "Failed to create mind map",
        details: error.message,
      });
    }

    let transformedData;
    try {
      transformedData = transformGroqResponse(mindMapData, subjectName);
    } catch (transformError) {
      console.error("Error transforming mind map data:", transformError.message);
      return res.status(500).json({
        success: false,
        error: "Failed to transform mind map data",
        details: transformError.message,
      });
    }

    const userId = req.user.uid;
    let result;
    try {
      if (db) {
        result = await db.collection("mindmaps").insertOne({
          userId: userId,
          title: subjectName,
          data: transformedData,
          createdAt: new Date(),
          lastModified: new Date(),
          syllabus: syllabus,
        });
        console.log(`Mind map saved to database with ID: ${result.insertedId}`);
      }
    } catch (dbError) {
      console.error("Error saving mind map to database:", dbError.message);
    }

    res.status(201).json({
      success: true,
      message: "Mind map created successfully",
      mindMapId: result?.insertedId || null,
      mindMap: transformedData,
    });
  } catch (error) {
    console.error("Error generating mind map from syllabus:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate mind map from syllabus",
      details: error.message,
    });
  }
});

// Endpoint for health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "UP",
    timestamp: new Date().toISOString(),
    dbConnected: !!db,
  });
});

// Global error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});