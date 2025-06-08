const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));