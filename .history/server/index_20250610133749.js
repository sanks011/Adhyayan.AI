const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: err.message 
  });
});

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

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
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
};

// For now, we'll skip Firebase Admin initialization since we need service account key
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Create users table if it doesn't exist
const createUsersTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created or already exists');
  } catch (error) {
    console.error('Error creating users table (DB not connected, continuing without DB):', error.message);
  }
};

// Initialize database (optional for now)
createUsersTable();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Test route
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Backend connected', time: result.rows[0].now });
  } catch (error) {
    console.error('Database connection error:');
    console.error(error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Authentication route - verify Google token and create session
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken, user } = req.body;
    
    // For now, we'll trust the frontend verification
    // In production, you should verify the idToken with Firebase Admin SDK
    
    try {
      // Check if user exists in database
      let dbUser = await pool.query(
        'SELECT * FROM users WHERE firebase_uid = $1',
        [user.uid]
      );

      if (dbUser.rows.length === 0) {
        // Create new user
        const result = await pool.query(
          `INSERT INTO users (firebase_uid, email, display_name, photo_url) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [user.uid, user.email, user.displayName, user.photoURL]
        );
        dbUser = result;
      } else {
        // Update existing user
        await pool.query(
          `UPDATE users SET 
           display_name = $1, 
           photo_url = $2, 
           updated_at = CURRENT_TIMESTAMP 
           WHERE firebase_uid = $3`,
          [user.displayName, user.photoURL, user.uid]
        );
      }
    } catch (dbError) {
      console.log('Database not available, continuing without user storage:', dbError.message);
    }

    // Create JWT token
    const jwtToken = jwt.sign(
      { 
        uid: user.uid, 
        email: user.email,
        displayName: user.displayName 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: jwtToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    });

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get user profile
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Logout route
app.post('/api/auth/logout', verifyToken, (req, res) => {
  // In a real app, you might want to blacklist the token
  res.json({ success: true, message: 'Logged out successfully' });
});

// Mind Map Generation API
app.post('/api/mindmap/generate', verifyToken, async (req, res) => {
  try {
    const { subjectName, syllabus } = req.body;

    if (!subjectName || !syllabus) {
      return res.status(400).json({ error: 'Subject name and syllabus are required' });
    }

    console.log('Generating mind map for:', subjectName);

    // Create a structured prompt for Groq
    const prompt = `Create a detailed mind map structure for the subject "${subjectName}" based on the following syllabus content:

${syllabus}

Please return a JSON structure with the following format:
{
  "title": "${subjectName}",
  "nodes": [
    {
      "id": "unique_id",
      "label": "Main Topic",
      "type": "main",
      "level": 1,
      "position": { "x": 0, "y": 0 },
      "content": "Detailed explanation of this topic...",
      "children": ["child_id_1", "child_id_2"]
    },
    {
      "id": "child_id_1", 
      "label": "Sub Topic 1",
      "type": "subtopic",
      "level": 2,
      "position": { "x": 200, "y": -100 },
      "content": "Detailed explanation...",
      "parent": "unique_id",
      "children": []
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "unique_id",
      "target": "child_id_1",
      "type": "default"
    }
  ]
}

Important guidelines:
1. Create hierarchical structure with main topics (level 1), subtopics (level 2), and sub-subtopics (level 3) if needed
2. Each node should have detailed educational content
3. Position nodes in a radial layout around the center
4. Create meaningful connections between related topics
5. Limit to maximum 15-20 nodes for initial version
6. Focus only on topics explicitly mentioned in the syllabus
7. Make content educational and comprehensive
8. Use clear, educational language suitable for learning

Return only valid JSON, no additional text.`;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator who specializes in creating structured learning materials and mind maps. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.3,
      max_tokens: 4000,
    });

    let mindMapData;
    try {
      const responseText = completion.choices[0]?.message?.content || '';
      console.log('Groq response:', responseText);
      
      // Clean the response to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        mindMapData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Groq response:', parseError);
      // Fallback mind map structure
      mindMapData = {
        title: subjectName,
        nodes: [
          {
            id: "main_1",
            label: subjectName,
            type: "main",
            level: 1,
            position: { x: 0, y: 0 },
            content: `This is the main topic for ${subjectName}. The mind map will be generated based on your syllabus content.`,
            children: []
          }
        ],
        edges: []
      };
    }

    // Store in database (optional for now)
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS mindmaps (
          id SERIAL PRIMARY KEY,
          user_uid VARCHAR(255) NOT NULL,
          subject_name VARCHAR(255) NOT NULL,
          syllabus TEXT,
          mindmap_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      );

      const result = await pool.query(
        `INSERT INTO mindmaps (user_uid, subject_name, syllabus, mindmap_data) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.uid, subjectName, syllabus, JSON.stringify(mindMapData)]
      );

      mindMapData.id = result.rows[0].id;
    } catch (dbError) {
      console.log('Database not available, continuing without storage:', dbError.message);
      mindMapData.id = Date.now(); // Temporary ID
    }

    res.json({
      success: true,
      mindMap: mindMapData
    });

  } catch (error) {
    console.error('Error generating mind map:', error);
    res.status(500).json({ 
      error: 'Failed to generate mind map', 
      details: error.message 
    });
  }
});

// Get user's mind maps
app.get('/api/mindmap/list', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, subject_name, created_at FROM mindmaps WHERE user_uid = $1 ORDER BY created_at DESC',
      [req.user.uid]
    );

    res.json({
      success: true,
      mindMaps: result.rows
    });
  } catch (error) {
    console.error('Error fetching mind maps:', error);
    res.status(500).json({ error: 'Failed to fetch mind maps' });
  }
});

// Get specific mind map
app.get('/api/mindmap/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM mindmaps WHERE id = $1 AND user_uid = $2',
      [req.params.id, req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mind map not found' });
    }

    res.json({
      success: true,
      mindMap: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching mind map:', error);
    res.status(500).json({ error: 'Failed to fetch mind map' });
  }
});

// Temporary CORS setup for initial deployment
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://adhyayan-ai.vercel.app',
        'https://adhyayan-ai-git-main.vercel.app', 
        'https://adhyayan-ai-git-main-sanks011.vercel.app' 
      ]
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Add this to keep service warm
setInterval(() => {
  if (process.env.NODE_ENV === 'production') {
    console.log('Keep alive ping:', new Date().toISOString());
  }
}, 14 * 60 * 1000); // Ping every 14 minutes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));