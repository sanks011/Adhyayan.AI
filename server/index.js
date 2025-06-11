const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const tesseract = require('tesseract.js');
const sharp = require('sharp');
const mammoth = require('mammoth');
const fs = require('fs').promises;
require('dotenv').config();

// Ensure JWT_SECRET exists or use a fallback for development
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not found in environment variables. Using fallback secret for development only.');
  process.env.JWT_SECRET = 'adhyayan_ai_development_secret';
} else {
  console.log('Using JWT_SECRET from environment variables');
}

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
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/markdown'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, MD, and image files are allowed.'));
    }
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  console.log('Verifying token...');
  console.log('Auth header:', req.headers.authorization);
  
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.log('Authentication error: No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      console.log('JWT_SECRET value:', process.env.JWT_SECRET);
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    console.log('Verifying with secret:', process.env.JWT_SECRET.substring(0, 3) + '...');    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.log('JWT verification error:', jwtError.message);
      console.log('Token attempted to verify:', token.substring(0, 10) + '...');
      return res.status(401).json({ error: 'Invalid token', details: jwtError.message });
    }
  } catch (error) {
    console.log('Authentication error:', error.message);
    return res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

// File processing helper functions
const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
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
    
    const { data: { text } } = await tesseract.recognize(processedImage, 'eng', {
      logger: m => console.log(m) // Optional: log progress
    });
    
    return text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image');
  }
};

const extractTextFromDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX');
  }
};

// File upload and processing endpoint
app.post('/api/upload/syllabus', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.originalname, 'Type:', req.file.mimetype);
    let extractedText = '';

    switch (req.file.mimetype) {
      case 'text/plain':
      case 'text/markdown':
        extractedText = req.file.buffer.toString('utf-8');
        break;
        
      case 'application/pdf':
        extractedText = await extractTextFromPDF(req.file.buffer);
        break;
        
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        extractedText = await extractTextFromDOCX(req.file.buffer);
        break;
        
      case 'image/png':
      case 'image/jpeg':
      case 'image/jpg':
        extractedText = await extractTextFromImage(req.file.buffer);
        break;
        
      default:
        return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    console.log('Successfully extracted text, length:', extractedText.length);

    res.json({
      success: true,
      extractedText: extractedText,
      filename: req.file.originalname,
      fileSize: req.file.size
    });

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ 
      error: 'Failed to process file', 
      details: error.message 
    });
  }
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

// Middleware to verify JWT token is now defined at the top of the file

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
    console.log('Google auth request received:', { uid: user?.uid, email: user?.email });
    
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
        console.log('Created new user in DB for:', user.email);
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
        console.log('Updated existing user in DB:', user.email);
      }
    } catch (dbError) {
      console.log('Database not available, continuing without user storage:', dbError.message);
    }    // Create JWT token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET missing for token creation');
      process.env.JWT_SECRET = 'adhyayan_ai_development_secret'; 
      console.log('Using fallback JWT_SECRET for development');
    }
    
    // Make sure we're using the correct JWT secret
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not found when creating token!');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    console.log('Creating JWT token with secret:', process.env.JWT_SECRET.substring(0, 3) + '...');
    
    const jwtToken = jwt.sign(
      { 
        uid: user.uid, 
        email: user.email,
        displayName: user.displayName 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('JWT token created successfully, first 10 chars:', jwtToken.substring(0, 10) + '...');

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

// Enhanced intelligent syllabus content extractor with structured format recognition
const extractSyllabusContent = (rawSyllabus) => {
  if (!rawSyllabus) return '';
  
  // Step 1: Detect if syllabus has structured tabular format
  const isTabularFormat = detectTabularFormat(rawSyllabus);
  
  if (isTabularFormat) {
    return extractStructuredContent(rawSyllabus);
  }
  
  // Step 2: Common patterns to identify actual course content
  const contentPatterns = [
    /course content[:\s]+(.*?)(?=text books?|reference books?|modes of evaluation|examination scheme|$)/is,
    /syllabus[:\s]+(.*?)(?=text books?|reference books?|modes of evaluation|examination scheme|$)/is,
    /unit[:\s-]+[IVX1-9]+[:\s]+(.*?)(?=text books?|reference books?|modes of evaluation|examination scheme|unit[:\s-]+[IVX1-9]+|$)/gis,
    /(?:chapter|topic|module)[:\s]+\d+[:\s]+(.*?)(?=(?:chapter|topic|module)[:\s]+\d+|text books?|reference books?|$)/gis,
  ];
  
  let extractedContent = '';
  
  // Try each pattern
  for (const pattern of contentPatterns) {
    const matches = rawSyllabus.match(pattern);
    if (matches) {
      if (pattern.global) {
        extractedContent += matches.join('\n\n');
      } else {
        extractedContent += matches[1] || matches[0];
      }
    }
  }
  
  // If no pattern matches, try to extract unit-wise content manually
  if (!extractedContent) {
    const lines = rawSyllabus.split('\n');
    let isContentSection = false;
    let contentLines = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim().toLowerCase();
      
      // Start capturing after course content/syllabus section
      if (trimmedLine.includes('course content') || 
          trimmedLine.includes('syllabus') || 
          trimmedLine.includes('unit-') ||
          trimmedLine.match(/unit[:\s-]+[ivx1-9]/)) {
        isContentSection = true;
        contentLines.push(line);
        continue;
      }
      
      // Stop capturing at reference sections
      if (isContentSection && (
          trimmedLine.includes('text book') ||
          trimmedLine.includes('reference book') ||
          trimmedLine.includes('mode of evaluation') ||
          trimmedLine.includes('examination scheme') ||
          trimmedLine.includes('relationship between')
      )) {
        break;
      }
      
      if (isContentSection) {
        contentLines.push(line);
      }
    }
    
    extractedContent = contentLines.join('\n');
  }
  
  // Clean up the extracted content
  extractedContent = extractedContent
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\n\-:,;\.]/g, ' ')
    .trim();
  
  return extractedContent || rawSyllabus; // Return original if extraction fails
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
    /(unit|chapter|topic|module)\s+[1-9][\.\):\-\s]+.+\s+[1-9]+[\s\%]/i
  ];
  
  return indicators.some(pattern => pattern.test(syllabus));
};

// Extract content from structured/tabular format
const extractStructuredContent = (syllabus) => {
  const lines = syllabus.split('\n');
  const structuredTopics = [];
  
  let currentUnit = null;
  let isInTableData = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip header rows and separators
    if (trimmedLine.includes('Unit') && trimmedLine.includes('Chapter') && 
        (trimmedLine.includes('Periods') || trimmedLine.includes('Hours') || trimmedLine.includes('Weightage'))) {
      isInTableData = true;
      continue;
    }
    
    if (trimmedLine.match(/^[\|\-\+\s]+$/)) {
      continue; // Skip separator lines
    }
    
    if (isInTableData && trimmedLine) {
      // Parse tabular data - handle various formats
      const unitChapterMatch = trimmedLine.match(/^[\|\s]*(?:unit\s*)?([1-9]+)[\.\)\|\s]+(.+?)[\|\s]+([1-9]+[\s\%]*)/i);
      const simpleTopicMatch = trimmedLine.match(/^[\|\s]*([^|\d]+?)[\|\s]+([1-9]+[\s\%]*)/i);
      
      if (unitChapterMatch) {
        const [, unitNum, chapterContent, periods] = unitChapterMatch;
        const cleanContent = chapterContent.replace(/[\|\-]+/g, ' ').trim();
        
        if (cleanContent && cleanContent.length > 3) {
          currentUnit = `Unit ${unitNum}`;
          structuredTopics.push(`${currentUnit}: ${cleanContent}`);
        }
      } else if (simpleTopicMatch) {
        const [, topicContent, periods] = simpleTopicMatch;
        const cleanContent = topicContent.replace(/[\|\-]+/g, ' ').trim();
        
        if (cleanContent && cleanContent.length > 3 && !cleanContent.toLowerCase().includes('unit')) {
          if (currentUnit) {
            structuredTopics.push(`${currentUnit} - ${cleanContent}`);
          } else {
            structuredTopics.push(cleanContent);
          }
        }
      }
    }
    
    // Also capture non-tabular unit descriptions
    const unitHeaderMatch = trimmedLine.match(/^unit[:\s-]*([1-9]+)[:\s-]+(.+)/i);
    if (unitHeaderMatch && !isInTableData) {
      const [, unitNum, unitTitle] = unitHeaderMatch;
      structuredTopics.push(`Unit ${unitNum}: ${unitTitle.trim()}`);
    }
    
    // Capture chapter/topic entries
    const chapterMatch = trimmedLine.match(/^(?:chapter|topic)[:\s-]*([1-9]+)[:\s-]+(.+)/i);
    if (chapterMatch) {
      const [, chapterNum, chapterTitle] = chapterMatch;
      structuredTopics.push(`Chapter ${chapterNum}: ${chapterTitle.trim()}`);
    }
  }
  
  return structuredTopics.length > 0 ? structuredTopics.join('\n') : syllabus;
};

// Determine subject domain for intelligent content generation
const detectSubjectDomain = (subjectName, syllabusContent) => {
  const subjectLower = subjectName.toLowerCase();
  const contentLower = syllabusContent.toLowerCase();
  
  // Mathematics/Engineering domains (heavy equation usage)
  const mathDomains = ['mathematics', 'calculus', 'algebra', 'statistics', 'physics', 'engineering', 'mechanics', 'thermodynamics', 'electromagnetic', 'quantum', 'differential', 'linear algebra', 'numerical analysis'];
  
  // Computer Science domains (code examples)
  const csDomains = ['computer science', 'programming', 'software', 'algorithm', 'data structure', 'machine learning', 'artificial intelligence', 'database', 'network', 'cybersecurity', 'web development', 'software engineering'];
  
  // Science domains (moderate equations, more descriptions)
  const scienceDomains = ['chemistry', 'biology', 'biochemistry', 'molecular', 'genetics', 'pharmacology', 'anatomy', 'physiology', 'ecology', 'botany', 'zoology', 'microbiology'];
  
  // Business/Social domains (minimal equations, more concepts)
  const businessDomains = ['business', 'management', 'marketing', 'finance', 'economics', 'accounting', 'organizational', 'strategic', 'human resource', 'psychology', 'sociology', 'political science', 'history', 'geography', 'literature', 'philosophy'];
  
  if (mathDomains.some(domain => subjectLower.includes(domain) || contentLower.includes(domain))) {
    return 'mathematics';
  }
  
  if (csDomains.some(domain => subjectLower.includes(domain) || contentLower.includes(domain))) {
    return 'computer_science';
  }
  
  if (scienceDomains.some(domain => subjectLower.includes(domain) || contentLower.includes(domain))) {
    return 'science';
  }
  
  if (businessDomains.some(domain => subjectLower.includes(domain) || contentLower.includes(domain))) {
    return 'business';
  }
  
  return 'general';
};

// Enhanced AI prompt generator for mind maps with intelligent content adaptation
const generateMindMapPrompt = (subjectName, syllabusContent) => {
  // Detect subject domain for intelligent content adaptation
  const subjectDomain = detectSubjectDomain(subjectName, syllabusContent);
  
  // Get domain-specific content guidelines
  const domainGuidelines = getDomainSpecificGuidelines(subjectDomain);
  
  return `You are an expert educational content creator and academic writer specializing in ${subjectName}. Create a comprehensive mind map structure based on this syllabus content:

${syllabusContent}

SUBJECT DOMAIN: ${subjectDomain.toUpperCase()}
${domainGuidelines}

CRITICAL CONTENT REQUIREMENTS - EACH NODE MUST HAVE DETAILED THEORY:

1. CENTRAL NODE: Write 300-400 words covering:
   - Complete overview of the subject
   - Historical context and importance
   - Key learning outcomes
   - How topics interconnect
   - Real-world applications

2. MAIN TOPIC NODES: Write 250-350 words for each including:
   - Detailed definition and explanation
   - Key concepts and terminology
   ${subjectDomain === 'mathematics' ? '- Mathematical formulas and proofs (use $formula$ for inline, $$formula$$ for block equations)' : ''}
   ${subjectDomain === 'computer_science' ? '- Code examples using ```language code blocks when relevant' : ''}
   ${subjectDomain === 'science' ? '- Scientific principles and moderate use of equations when necessary' : ''}
   ${subjectDomain === 'business' ? '- Conceptual frameworks, models, and strategic approaches' : ''}
   - Practical examples and applications
   - How it connects to other topics
   - Common misconceptions and important notes

3. SUBTOPIC NODES: Write 200-300 words including:
   - Comprehensive explanation of the concept
   - Step-by-step processes or methodologies
   ${getSubtopicDomainSpecifics(subjectDomain)}
   - Real-world examples and case studies
   - Problem-solving techniques
   - Key points to remember

FORMATTING GUIDELINES FOR CONTENT:
- Use ## for main headings
- Use ### for subheadings
- Use **bold** for emphasis
- Use - for bullet points
- Use numbered lists for sequential steps
${getFormattingGuidelines(subjectDomain)}

DETAILED CONTENT EXAMPLES FOR REFERENCE:

${getDomainSpecificExamples(subjectDomain)}

STRUCTURAL REQUIREMENTS:
1. Analyze syllabus and identify main topics/units mentioned
2. Create hierarchical structure: Main Topic → Subtopics → Sub-subtopics
3. Generate 6-10 main nodes maximum
4. Position nodes for visual appeal
5. Ensure each content field has 200-400 words of detailed theory

REQUIRED JSON FORMAT:
{
  "title": "${subjectName}",
  "subject": "${subjectName}",
  "nodes": [
    {
      "id": "central",
      "label": "${subjectName}",
      "type": "root",
      "level": 0,
      "position": { "x": 300, "y": 200 },
      "content": "300-400 words comprehensive overview with historical context, importance, learning outcomes, interconnections, and applications...",
      "isRoot": true,
      "hasChildren": true,
      "children": ["topic1", "topic2", ...]
    },
    {
      "id": "topic1",
      "label": "Main Topic Name",
      "type": "topic",
      "level": 1,
      "position": { "x": 600, "y": 100 },
      "content": "250-350 words detailed explanation with definitions, key concepts, ${subjectDomain === 'mathematics' ? 'mathematical formulas using KaTeX,' : subjectDomain === 'computer_science' ? 'code examples,' : ''} examples, applications, and connections...",
      "parentNode": "central",
      "hasChildren": true,
      "children": ["subtopic1_1", "subtopic1_2"]
    },
    {
      "id": "subtopic1_1",
      "label": "Subtopic Name",
      "type": "subtopic",
      "level": 2,
      "position": { "x": 900, "y": 80 },
      "content": "200-300 words comprehensive explanation with processes, ${subjectDomain === 'mathematics' ? 'equations,' : ''} examples, problem-solving techniques, and key points...",
      "parentNode": "topic1",
      "hasChildren": false,
      "children": []
    }
  ],
  "edges": [
    {
      "id": "central-topic1",
      "source": "central",
      "target": "topic1",
      "type": "bezier"
    }
  ]
}

POSITIONING GUIDELINES:
- Central node at (300, 200)
- Main topics at x=600, spread vertically (y=50, 150, 250, etc.)
- Subtopics at x=900, positioned relative to parent
- Ensure no overlapping nodes

Return ONLY valid JSON. No markdown formatting around the JSON, no explanations, just the pure JSON structure with detailed content for each node.`;
};

// Get domain-specific content guidelines
const getDomainSpecificGuidelines = (domain) => {
  const guidelines = {
    mathematics: `
MATHEMATICS DOMAIN GUIDELINES:
- Heavy use of mathematical equations and formulas using KaTeX syntax
- Include derivations, proofs, and mathematical reasoning
- Focus on problem-solving techniques and computational methods
- Emphasize theoretical foundations and practical applications
- Use precise mathematical terminology and notation`,

    computer_science: `
COMPUTER SCIENCE DOMAIN GUIDELINES:
- Include relevant code examples in appropriate programming languages
- Focus on algorithms, data structures, and computational complexity
- Explain implementation details and best practices
- Cover both theoretical concepts and practical programming
- Use technical terminology and industry-standard practices`,

    science: `
SCIENCE DOMAIN GUIDELINES:
- Include scientific principles and moderate use of equations when necessary
- Focus on experimental methods, observations, and empirical evidence
- Explain natural phenomena and scientific processes
- Include real-world examples from research and applications
- Balance theoretical understanding with practical implications`,

    business: `
BUSINESS DOMAIN GUIDELINES:
- Focus on conceptual frameworks, strategic models, and business principles
- Minimal use of equations - only for financial calculations when relevant
- Emphasize case studies, real-world examples, and practical applications
- Include management theories, organizational behavior concepts
- Focus on decision-making processes and strategic thinking`,

    general: `
GENERAL DOMAIN GUIDELINES:
- Adapt content style to match the subject matter naturally
- Use equations, code, or frameworks only when truly relevant
- Focus on clear explanations and practical understanding
- Include diverse examples and applications appropriate to the field`
  };
  
  return guidelines[domain] || guidelines.general;
};

// Get subtopic domain-specific content requirements
const getSubtopicDomainSpecifics = (domain) => {
  const specifics = {
    mathematics: '- Detailed mathematical derivations and equation explanations\n   - Problem-solving algorithms and computational techniques',
    computer_science: '- Algorithm implementations and code snippets\n   - Complexity analysis and optimization techniques',
    science: '- Experimental procedures and scientific methodologies\n   - Empirical evidence and research findings',
    business: '- Strategic frameworks and business models\n   - Case study analysis and practical implementation',
    general: '- Relevant technical details appropriate to the subject\n   - Domain-specific methodologies and best practices'
  };
  
  return specifics[domain] || specifics.general;
};

// Get formatting guidelines specific to domain
const getFormattingGuidelines = (domain) => {
  const guidelines = {
    mathematics: `- Include equations using KaTeX syntax:
  * Inline: $E = mc^2$
  * Block: $$\\frac{d^2y}{dx^2} + p(x)\\frac{dy}{dx} + q(x)y = f(x)$$
- Use mathematical notation and symbols appropriately`,

    computer_science: `- Include code blocks for relevant examples:
  \`\`\`python
  def algorithm_example():
      return "code here"
  \`\`\`
- Use inline code for \`variables\` and \`functions\``,

    science: `- Include equations sparingly and only when essential:
  * Simple: $F = ma$
  * Complex: $$E = \\sqrt{(pc)^2 + (mc^2)^2}$$
- Focus more on descriptive explanations`,

    business: `- Use business terminology and frameworks
- Include financial formulas only when necessary: $ROI = \\frac{Gain - Cost}{Cost} \\times 100\\%$
- Focus on conceptual models and strategic thinking`,

    general: `- Use appropriate technical formatting based on subject matter
- Include relevant equations, code, or frameworks as needed`
  };
  
  return guidelines[domain] || guidelines.general;
};

// Get domain-specific examples for the AI to reference
const getDomainSpecificExamples = (domain) => {
  const examples = {
    mathematics: `
EXAMPLE - MATHEMATICAL TOPIC (280+ words):
"content": "## Partial Differential Equations

Partial Differential Equations (PDEs) are fundamental mathematical tools used to describe phenomena involving multiple variables and their rates of change. Unlike ordinary differential equations, PDEs involve partial derivatives and are essential for modeling complex physical systems across engineering, physics, and applied mathematics.

### Mathematical Foundation

A PDE involves an unknown function $u(x,y,t)$ of multiple independent variables and its partial derivatives. The general form can be expressed as:

$$F\\left(x, y, t, u, \\frac{\\partial u}{\\partial x}, \\frac{\\partial u}{\\partial y}, \\frac{\\partial u}{\\partial t}, \\frac{\\partial^2 u}{\\partial x^2}, \\frac{\\partial^2 u}{\\partial y^2}, \\frac{\\partial^2 u}{\\partial t^2}, ...\\right) = 0$$

### Classification and Types

PDEs are classified based on their **order** (highest derivative) and **linearity**:

- **First-order PDEs**: $\\frac{\\partial u}{\\partial t} + c\\frac{\\partial u}{\\partial x} = 0$ (transport equation)
- **Second-order PDEs**: Include elliptic, parabolic, and hyperbolic types
- **Linear vs Nonlinear**: Linear PDEs follow superposition principle

### Solution Methods

**Separation of Variables**: Assume $u(x,t) = X(x)T(t)$ and separate the PDE into ODEs.

**Method of Characteristics**: For first-order PDEs, find characteristic curves along which the PDE becomes an ODE.

**Fourier Series Method**: Expand solutions in terms of eigenfunctions of related Sturm-Liouville problems.

### Real-World Applications

- **Heat conduction**: $\\frac{\\partial T}{\\partial t} = \\alpha \\nabla^2 T$ (thermal diffusion)
- **Wave propagation**: $\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u$ (sound, electromagnetic waves)
- **Quantum mechanics**: Schrödinger equation $i\\hbar\\frac{\\partial \\psi}{\\partial t} = \\hat{H}\\psi$

Understanding PDEs is crucial for modeling continuous systems and forms the mathematical foundation for computational methods like finite element analysis."`,

    computer_science: `
EXAMPLE - COMPUTER SCIENCE TOPIC (300+ words):
"content": "## Algorithm Design and Analysis

Algorithm design is the systematic process of creating step-by-step procedures to solve computational problems efficiently. This fundamental area of computer science focuses on developing optimal solutions while considering time complexity, space complexity, and correctness.

### Design Paradigms

**Divide and Conquer**: Break problems into smaller subproblems, solve recursively, and combine results.

\`\`\`python
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    return merge(left, right)
\`\`\`

**Dynamic Programming**: Solve overlapping subproblems once and store results for reuse.

**Greedy Algorithms**: Make locally optimal choices at each step, hoping to find global optimum.

### Complexity Analysis

**Time Complexity**: Measures how runtime scales with input size.
- **O(1)**: Constant time operations
- **O(log n)**: Logarithmic time (binary search)
- **O(n)**: Linear time (single loop)
- **O(n log n)**: Linearithmic time (merge sort)
- **O(n²)**: Quadratic time (bubble sort)

**Space Complexity**: Measures memory usage relative to input size.

### Algorithm Correctness

**Invariants**: Properties that remain true throughout algorithm execution.

**Proof Techniques**:
- **Mathematical Induction**: Prove base case and inductive step
- **Loop Invariants**: Prove correctness of iterative algorithms
- **Contradiction**: Assume incorrectness and derive contradiction

### Advanced Topics

**Approximation Algorithms**: Provide near-optimal solutions for NP-hard problems.

**Randomized Algorithms**: Use random choices during execution for efficiency or simplicity.

**Parallel Algorithms**: Designed for concurrent execution on multiple processors.

### Real-World Applications

- **Search Engines**: PageRank algorithm for ranking web pages
- **Machine Learning**: Gradient descent optimization
- **Network Routing**: Shortest path algorithms (Dijkstra's, A*)
- **Database Systems**: Query optimization and indexing
- **Cryptography**: Encryption and digital signature algorithms

Understanding algorithm design principles enables efficient problem-solving and forms the foundation for advanced computer science topics including artificial intelligence, systems programming, and computational theory."`,

    science: `
EXAMPLE - SCIENCE TOPIC (270+ words):
"content": "## Photosynthesis and Cellular Energy Conversion

Photosynthesis is the fundamental biological process by which plants, algae, and some bacteria convert light energy into chemical energy, producing glucose and oxygen from carbon dioxide and water. This process sustains virtually all life on Earth by providing the primary source of organic compounds and atmospheric oxygen.

### Overall Reaction

The simplified equation for photosynthesis is:
$$6CO_2 + 6H_2O + \\text{light energy} \\rightarrow C_6H_{12}O_6 + 6O_2$$

### Light-Dependent Reactions (Photosystem)

**Location**: Thylakoid membranes of chloroplasts

**Process**: Chlorophyll absorbs photons, exciting electrons to higher energy levels. This energy drives:
- **Water photolysis**: $2H_2O \\rightarrow 4H^+ + 4e^- + O_2$
- **ATP synthesis**: ADP + Pi + energy → ATP
- **NADPH formation**: NADP+ + 2e- + H+ → NADPH

**Key Components**:
- **Photosystem II**: Absorbs light at 680nm, splits water molecules
- **Electron transport chain**: Transfers electrons between photosystems
- **Photosystem I**: Absorbs light at 700nm, reduces NADP+

### Light-Independent Reactions (Calvin Cycle)

**Location**: Stroma of chloroplasts

**Carbon Fixation**: CO₂ combines with ribulose-1,5-bisphosphate (RuBP) via RuBisCO enzyme.

**Reduction Phase**: 3-phosphoglycerate reduced to glyceraldehyde-3-phosphate using ATP and NADPH.

**Regeneration**: RuBP regenerated to continue the cycle.

### Environmental Factors

**Light Intensity**: Affects rate of light reactions until saturation point.

**Temperature**: Influences enzyme activity, particularly RuBisCO efficiency.

**CO₂ Concentration**: Can be limiting factor in carbon fixation.

### Adaptations and Variations

**C4 Photosynthesis**: Spatial separation of CO₂ fixation and Calvin cycle (corn, sugarcane).

**CAM Photosynthesis**: Temporal separation - open stomata at night (cacti, succulents).

### Ecological Significance

Photosynthesis produces approximately 170 billion tons of carbohydrates annually, supporting food webs and maintaining atmospheric oxygen levels. Understanding this process is crucial for addressing climate change, improving crop yields, and developing renewable energy technologies."`,

    business: `
EXAMPLE - BUSINESS TOPIC (280+ words):
"content": "## Strategic Management and Competitive Advantage

Strategic Management encompasses the comprehensive planning, execution, and evaluation of organizational initiatives designed to achieve long-term competitive advantage. This multidisciplinary field integrates insights from economics, psychology, sociology, and organizational theory to guide firms toward sustainable success in dynamic business environments.

### Theoretical Foundations

**Resource-Based View (RBV)**: Firms achieve competitive advantage through unique, valuable, rare, inimitable, and non-substitutable (VRIN) resources. Value creation can be expressed as:
$$\\text{Value} = \\text{Benefits} - \\text{Costs}$$

**Dynamic Capabilities Framework**: Organizations must continuously adapt by developing capabilities to integrate, build, and reconfigure internal and external competencies.

**Porter's Five Forces Model**: Industry attractiveness depends on:
1. **Threat of new entrants**: Barriers to entry and switching costs
2. **Bargaining power of suppliers**: Supplier concentration and differentiation
3. **Bargaining power of buyers**: Customer concentration and price sensitivity
4. **Threat of substitutes**: Alternative products or services
5. **Competitive rivalry**: Industry growth rate and competitor diversity

### Strategic Analysis Tools

**SWOT Analysis**: Systematic evaluation of Strengths, Weaknesses, Opportunities, and Threats.

**Value Chain Analysis**: Examines primary activities (inbound logistics, operations, outbound logistics, marketing, service) and support activities (procurement, technology, human resources, infrastructure).

**BCG Growth-Share Matrix**: Portfolio analysis categorizing business units as Stars, Cash Cows, Question Marks, or Dogs.

### Competitive Strategy Types

**Cost Leadership**: Achieving lowest operational costs through economies of scale and operational efficiency.

**Differentiation**: Creating unique value propositions through innovation, quality, or brand positioning.

**Focus Strategy**: Concentrating on specific market segments, applying either cost leadership or differentiation within narrow scope.

### Implementation Framework

**Balanced Scorecard**: Integrates four perspectives:
- Financial performance measures
- Customer relationship metrics
- Internal process efficiency
- Learning and growth capabilities

Success requires alignment between organizational structure, culture, systems, and strategic objectives. Key performance indicators should reflect both financial metrics (ROI, EVA) and non-financial measures (customer satisfaction, innovation rate).

Strategic management remains essential for navigating complexity, uncertainty, and technological change in global markets."`,

    general: `
EXAMPLE - GENERAL ACADEMIC TOPIC (250+ words):
"content": "## Core Learning Principles and Knowledge Acquisition

This topic represents a fundamental area of study that requires systematic understanding and practical application. The content integrates theoretical foundations with real-world applications, providing learners with comprehensive knowledge and practical skills.

### Conceptual Framework

The subject matter is built upon established principles that have evolved through research and practice. Key theoretical components include:

- **Foundational Concepts**: Basic principles that form the building blocks of understanding
- **Advanced Applications**: Complex scenarios requiring synthesis of multiple concepts
- **Interdisciplinary Connections**: Relationships with other fields of study
- **Practical Implementation**: Real-world application of theoretical knowledge

### Learning Methodology

**Progressive Development**: Knowledge builds systematically from basic concepts to advanced applications.

**Active Engagement**: Learners must participate actively in problem-solving and critical analysis.

**Practical Application**: Theory must be connected to real-world scenarios and case studies.

### Key Components

**Analytical Thinking**: Developing skills to break down complex problems into manageable components.

**Synthesis Skills**: Combining different concepts and ideas to create comprehensive understanding.

**Evaluation Techniques**: Assessing the validity and reliability of information and solutions.

### Assessment and Mastery

Understanding is demonstrated through:
- Conceptual comprehension and explanation
- Problem-solving capabilities
- Application to novel situations
- Critical analysis of related issues

### Real-World Relevance

This area of study has significant applications in professional practice, academic research, and personal development. Mastery provides foundation for advanced study and practical problem-solving in various contexts.

The systematic approach to this subject ensures comprehensive understanding and practical competency essential for academic success and professional advancement."`
  };
  
  return examples[domain] || examples.general;
};

// Mind Map Generation API
app.post('/api/mindmap/generate', verifyToken, async (req, res) => {
  try {
    const { subjectName, syllabus } = req.body;

    if (!subjectName) {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    console.log('Generating mind map for:', subjectName);
    console.log('Syllabus length:', syllabus?.length || 0);

    // Extract relevant content from syllabus
    const cleanedSyllabus = extractSyllabusContent(syllabus || '');
    console.log('Extracted syllabus content:', cleanedSyllabus.substring(0, 200) + '...');

    // Generate enhanced prompt
    const prompt = generateMindMapPrompt(subjectName, cleanedSyllabus);    // Try to call the Groq API with available models
    let completion;
    const groqModels = [
      "llama3-70b-8192", // First choice: latest stable Llama 3 model
      "mixtral-8x7b-32768", // Second choice: alternative model
      "gemma-7b-it"  // Third choice: fallback model
    ];
    
    let modelError = null;
    // Try each model in sequence until one works
    for (const model of groqModels) {
      try {
        console.log(`Attempting to use Groq model: ${model}`);
        completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are an expert educational content creator specializing in mind maps and structured learning. Always respond with valid JSON only, no additional text or formatting."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: model,
          temperature: 0.2, // Lower temperature for more consistent results
          max_tokens: 6000, // Increased for more detailed content
          top_p: 0.9,
        });
        console.log(`Successfully generated content using model: ${model}`);
        modelError = null;
        break; // Break the loop if successful
      } catch (error) {
        console.error(`Error with model ${model}:`, error.message);
        modelError = error;
      }
    }
    
    // If all models failed, throw an error
    if (modelError) {
      throw new Error(`Failed to generate content with any available model: ${modelError.message}`);
    }

    let mindMapData;
    try {
      const responseText = completion.choices[0]?.message?.content || '';
      console.log('Groq response preview:', responseText.substring(0, 500) + '...');
      
      // Clean and extract JSON
      const cleanResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        mindMapData = JSON.parse(jsonMatch[0]);
        
        // Validate the structure
        if (!mindMapData.nodes || !Array.isArray(mindMapData.nodes)) {
          throw new Error('Invalid mind map structure: missing nodes array');
        }
        
        // Ensure all required fields exist
        mindMapData.title = mindMapData.title || subjectName;
        mindMapData.subject = mindMapData.subject || subjectName;
        mindMapData.created_at = new Date().toISOString();
        mindMapData.updated_at = new Date().toISOString();
        
        console.log('Successfully parsed mind map with', mindMapData.nodes.length, 'nodes');
        
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Groq response:', parseError);
      console.log('Raw response:', completion.choices[0]?.message?.content);
      
      // Enhanced fallback mind map structure
      mindMapData = createFallbackMindMap(subjectName, cleanedSyllabus);
    }

    // Store in database
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
        )`
      );

      const result = await pool.query(
        `INSERT INTO mindmaps (user_uid, subject_name, syllabus, mindmap_data) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [req.user.uid, subjectName, syllabus || '', JSON.stringify(mindMapData)]
      );

      mindMapData.id = result.rows[0].id;
      console.log('Mind map saved to database with ID:', mindMapData.id);
      
    } catch (dbError) {
      console.log('Database not available, continuing without storage:', dbError.message);
      mindMapData.id = `temp_${Date.now()}`; // Temporary ID
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

// Create fallback mind map structure
// Create intelligent fallback mind map structure with domain-aware content
const createFallbackMindMap = (subjectName, syllabusContent) => {
  // Determine subject domain
  const domain = detectSubjectDomain(subjectName, syllabusContent);
  
  // Try to extract topics from syllabus content using intelligent parsing
  const cleanedSyllabus = extractSyllabusContent(syllabusContent);
  const lines = cleanedSyllabus.split('\n').filter(line => line.trim());
  const topics = [];
  
  // Enhanced topic extraction patterns
  lines.forEach(line => {
    const unitMatch = line.match(/unit[:\s-]+[ivx1-9]+[:\s]*(.+)/i);
    const chapterMatch = line.match(/chapter[:\s]+\d+[:\s]*(.+)/i);
    const topicMatch = line.match(/^[1-9]\.\s*(.+)/);
    const bulletMatch = line.match(/^[-•*]\s*(.+)/);
    
    if (unitMatch && unitMatch[1]) {
      topics.push(unitMatch[1].trim());
    } else if (chapterMatch && chapterMatch[1]) {
      topics.push(chapterMatch[1].trim());
    } else if (topicMatch && topicMatch[1]) {
      topics.push(topicMatch[1].trim());
    } else if (bulletMatch && bulletMatch[1] && bulletMatch[1].length > 10) {
      topics.push(bulletMatch[1].trim());
    }
  });
  
  // Intelligent fallback topics based on domain if extraction fails
  if (topics.length === 0) {
    topics.push(...getDomainSpecificFallbackTopics(subjectName, domain));
  }
  
  // Limit to 6 topics maximum
  const limitedTopics = topics.slice(0, 6);
  
  const nodes = [
    {
      id: "central",
      label: subjectName,
      type: "root",
      level: 0,
      position: { x: 300, y: 200 },
      content: generateDomainSpecificContent(subjectName, 'central', domain, subjectName),
      isRoot: true,
      hasChildren: true,
      children: []
    }
  ];
  
  const edges = [];
  
  limitedTopics.forEach((topic, index) => {
    const nodeId = `topic_${index + 1}`;
    nodes[0].children.push(nodeId);
    
    // Position nodes in a radial pattern
    const yPos = 50 + (index * 100);
    
    nodes.push({
      id: nodeId,
      label: topic,
      type: "topic",
      level: 1,
      position: { x: 600, y: yPos },
      content: generateDomainSpecificContent(topic, 'topic', domain, subjectName),
      parentNode: "central",
      hasChildren: false,
      children: []
    });
    
    edges.push({
      id: `central-${nodeId}`,
      source: "central",
      target: nodeId,
      type: "bezier"
    });
  });
  
  return {
    title: subjectName,
    subject: subjectName,
    nodes: nodes,
    edges: edges,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

// Get domain-specific fallback topics
const getDomainSpecificFallbackTopics = (subjectName, domain) => {
  const fallbackTopics = {
    mathematics: [
      `Introduction to ${subjectName}`,
      'Fundamental Theorems and Principles',
      'Mathematical Methods and Techniques',
      'Advanced Problem Solving',
      'Applications and Modeling',
      'Computational Methods'
    ],
    computer_science: [
      `${subjectName} Fundamentals`,
      'Algorithms and Data Structures',
      'Implementation Techniques',
      'Performance Analysis',
      'Real-World Applications',
      'Advanced Topics and Trends'
    ],
    science: [
      `Introduction to ${subjectName}`,
      'Basic Principles and Concepts',
      'Experimental Methods',
      'Advanced Phenomena',
      'Applications and Technology',
      'Current Research and Future Directions'
    ],
    business: [
      `${subjectName} Overview`,
      'Theoretical Frameworks',
      'Strategic Analysis',
      'Implementation Strategies',
      'Case Studies and Applications',
      'Future Trends and Challenges'
    ],
    general: [
      `Introduction to ${subjectName}`,
      'Fundamentals and Basics',
      'Core Concepts',
      'Advanced Topics',
      'Applications and Examples',
      'Summary and Conclusion'
    ]
  };
  
  return fallbackTopics[domain] || fallbackTopics.general;
};

// Generate domain-specific content for nodes
const generateDomainSpecificContent = (topicTitle, nodeType, domain, subjectName) => {
  const baseTemplates = {
    central: {
      mathematics: `## ${subjectName}: Mathematical Foundations and Applications

${subjectName} represents a fundamental area of mathematical study that combines theoretical rigor with practical applications. This comprehensive field encompasses analytical techniques, computational methods, and problem-solving strategies essential for advanced mathematical understanding.

### Mathematical Framework

The subject builds upon established mathematical principles, including:
- **Theoretical Foundations**: Core mathematical concepts and proofs
- **Analytical Methods**: Systematic approaches to problem-solving
- **Computational Techniques**: Numerical methods and algorithmic solutions
- **Applications**: Real-world modeling and practical implementations

### Learning Objectives

Students will develop:
- Rigorous mathematical reasoning and proof techniques
- Proficiency in analytical and computational methods
- Ability to model complex problems mathematically
- Understanding of theoretical foundations and practical applications

### Interconnections

This field connects with various mathematical disciplines including algebra, calculus, statistics, and applied mathematics. Understanding these connections enables comprehensive mathematical literacy and advanced problem-solving capabilities.

### Real-World Applications

${subjectName} finds applications in engineering, physics, computer science, economics, and many other fields. Mastery provides foundation for advanced study and professional applications in technical and scientific domains.

The systematic study of ${subjectName} develops critical thinking, analytical skills, and mathematical intuition essential for academic success and professional advancement.`,

      computer_science: `## ${subjectName}: Computational Theory and Practice

${subjectName} represents a dynamic field within computer science that combines theoretical foundations with practical implementation. This discipline focuses on algorithmic thinking, computational efficiency, and software engineering principles essential for modern technology development.

### Computational Framework

The field encompasses several key areas:
- **Algorithmic Design**: Systematic approaches to problem-solving
- **Data Structures**: Efficient organization and manipulation of information
- **Software Engineering**: Best practices for large-scale system development
- **Performance Analysis**: Complexity theory and optimization techniques

### Core Competencies

Students will develop:
- Proficiency in programming languages and development tools
- Understanding of algorithmic complexity and optimization
- Ability to design and implement efficient software systems
- Knowledge of computer science theory and practical applications

### Technical Skills

The curriculum emphasizes both theoretical understanding and hands-on experience with:
\`\`\`python
# Example: Core programming concepts
def solve_problem(input_data):
    # Algorithm implementation
    return optimized_solution
\`\`\`

### Industry Applications

${subjectName} has extensive applications in software development, artificial intelligence, cybersecurity, data science, and emerging technologies. Understanding these applications prepares students for careers in technology and innovation.

The study of ${subjectName} develops computational thinking, problem-solving skills, and technical expertise crucial for success in the digital economy.`,

      science: `## ${subjectName}: Scientific Principles and Discovery

${subjectName} represents a fundamental area of scientific study that explores natural phenomena through systematic observation, experimentation, and theoretical analysis. This field combines empirical investigation with theoretical understanding to advance human knowledge.

### Scientific Framework

The discipline encompasses:
- **Theoretical Foundations**: Core scientific principles and laws
- **Experimental Methods**: Systematic approaches to investigation
- **Data Analysis**: Statistical and analytical techniques
- **Applications**: Practical implementations and technological development

### Research Methodology

Scientific inquiry follows established procedures:
1. **Observation**: Systematic data collection and analysis
2. **Hypothesis Formation**: Theoretical explanations for observed phenomena
3. **Experimentation**: Controlled testing of hypotheses
4. **Analysis and Interpretation**: Statistical evaluation of results
5. **Communication**: Peer review and scientific publication

### Interdisciplinary Connections

${subjectName} connects with mathematics, physics, chemistry, biology, and engineering. These interdisciplinary relationships enable comprehensive understanding and innovative research approaches.

### Real-World Impact

Scientific discoveries in ${subjectName} contribute to technological advancement, medical breakthroughs, environmental solutions, and improved quality of life. Understanding these applications demonstrates the practical value of scientific knowledge.

The study of ${subjectName} develops critical thinking, analytical skills, and scientific literacy essential for informed citizenship and professional success in science-related fields.`,

      business: `## ${subjectName}: Strategic Management and Business Excellence

${subjectName} represents a comprehensive area of business study that integrates strategic thinking, operational management, and organizational leadership. This field combines theoretical frameworks with practical applications to drive business success and competitive advantage.

### Business Framework

The discipline encompasses several key components:
- **Strategic Analysis**: Market assessment and competitive positioning
- **Organizational Management**: Leadership, culture, and human resources
- **Operational Excellence**: Process optimization and quality management
- **Financial Performance**: Resource allocation and value creation

### Core Competencies

Business professionals develop:
- Strategic thinking and decision-making capabilities
- Leadership and interpersonal skills
- Analytical and problem-solving abilities
- Understanding of global business environments

### Management Principles

Key concepts include:
- **Value Creation**: $\\text{Value} = \\text{Benefits} - \\text{Costs}$
- **Competitive Advantage**: Sustainable differentiation strategies
- **Organizational Effectiveness**: Alignment of structure, culture, and strategy
- **Stakeholder Management**: Balancing diverse interests and expectations

### Industry Applications

${subjectName} applies across all industries and sectors, from startups to multinational corporations. Understanding these applications prepares students for leadership roles in business and management.

The study of ${subjectName} develops strategic thinking, leadership capabilities, and business acumen essential for professional success and organizational effectiveness.`,

      general: `## ${subjectName}: Comprehensive Learning and Understanding

${subjectName} represents an important area of academic study that combines theoretical knowledge with practical applications. This field provides students with comprehensive understanding and essential skills for academic and professional success.

### Academic Framework

The discipline encompasses:
- **Foundational Concepts**: Core principles and theories
- **Analytical Methods**: Critical thinking and problem-solving approaches
- **Practical Applications**: Real-world implementations and case studies
- **Advanced Topics**: Specialized areas and emerging trends

### Learning Objectives

Students will develop:
- Comprehensive understanding of fundamental concepts
- Critical thinking and analytical skills
- Ability to apply knowledge in practical contexts
- Communication and presentation capabilities

### Interdisciplinary Connections

${subjectName} connects with various fields of study, enabling students to understand relationships between different disciplines and apply knowledge across multiple domains.

### Career Preparation

The study of ${subjectName} prepares students for diverse career opportunities and provides foundation for advanced study in related fields. Understanding these applications demonstrates the practical value of academic learning.

The comprehensive approach to ${subjectName} develops intellectual capabilities, practical skills, and professional competencies essential for success in academic and professional environments.`
    },

    topic: {
      mathematics: `## ${topicTitle}

This topic covers essential mathematical concepts and techniques fundamental to understanding ${topicTitle}. The content integrates theoretical foundations with computational methods and practical applications.

### Mathematical Foundations

Key concepts include:
- **Definitions and Terminology**: Precise mathematical language and notation
- **Theoretical Framework**: Core principles and mathematical relationships
- **Proof Techniques**: Logical reasoning and mathematical argumentation
- **Computational Methods**: Algorithmic approaches and numerical solutions

### Problem-Solving Approaches

Students learn systematic methods for:
1. **Problem Analysis**: Understanding mathematical requirements
2. **Solution Strategies**: Selecting appropriate mathematical techniques
3. **Implementation**: Applying mathematical methods effectively
4. **Verification**: Checking solutions and ensuring accuracy

### Applications and Examples

Real-world applications demonstrate the practical relevance of mathematical concepts. Examples include modeling, optimization, and quantitative analysis in various fields.

Understanding ${topicTitle} provides essential foundation for advanced mathematical study and professional applications requiring quantitative analysis and problem-solving skills.`,

      computer_science: `## ${topicTitle}

This topic explores fundamental concepts in ${topicTitle}, combining theoretical computer science with practical programming and system design. The content emphasizes both conceptual understanding and hands-on implementation.

### Technical Framework

Core areas include:
- **Algorithmic Design**: Systematic approaches to problem-solving
- **Implementation Techniques**: Programming best practices and patterns
- **Performance Analysis**: Complexity evaluation and optimization
- **System Integration**: Connecting components and ensuring reliability

### Programming Concepts

Key technical skills include:
\`\`\`python
# Example implementation pattern
class TopicImplementation:
    def __init__(self, parameters):
        self.config = parameters
    
    def process(self, data):
        return self.algorithm(data)
\`\`\`

### Industry Applications

Real-world applications demonstrate practical relevance in software development, system architecture, and technology innovation. Understanding these applications prepares students for professional software development roles.

Mastery of ${topicTitle} provides essential foundation for advanced computer science study and professional development in technology fields.`,

      science: `## ${topicTitle}

This topic explores the scientific principles and phenomena related to ${topicTitle}. The content combines theoretical understanding with experimental investigation and practical applications.

### Scientific Principles

Fundamental concepts include:
- **Theoretical Framework**: Core scientific laws and principles
- **Experimental Methods**: Systematic investigation techniques
- **Data Analysis**: Statistical interpretation and evaluation
- **Applications**: Practical implementations and technology development

### Research Methodology

Scientific investigation follows established procedures:
1. **Observation**: Systematic data collection
2. **Hypothesis Development**: Theoretical explanations
3. **Experimental Design**: Controlled testing procedures
4. **Analysis**: Statistical evaluation and interpretation

### Real-World Applications

Scientific understanding of ${topicTitle} contributes to technological advancement, environmental solutions, and improved quality of life. These applications demonstrate the practical value of scientific knowledge.

Understanding ${topicTitle} provides foundation for advanced scientific study and professional applications in research, technology, and related fields.`,

      business: `## ${topicTitle}

This topic covers essential business concepts and practices related to ${topicTitle}. The content integrates strategic thinking with operational management and practical implementation.

### Business Framework

Key components include:
- **Strategic Analysis**: Market evaluation and competitive assessment
- **Operational Management**: Process optimization and resource allocation
- **Performance Measurement**: Key indicators and success metrics
- **Implementation Strategies**: Practical approaches to achieving objectives

### Management Principles

Core concepts include:
- **Value Creation**: Maximizing stakeholder benefits
- **Competitive Strategy**: Achieving sustainable advantage
- **Organizational Effectiveness**: Aligning resources and capabilities
- **Risk Management**: Identifying and mitigating potential challenges

### Industry Applications

Business principles related to ${topicTitle} apply across multiple industries and organizational contexts. Understanding these applications prepares students for leadership and management roles.

Mastery of ${topicTitle} provides foundation for advanced business study and professional success in management and leadership positions.`,

      general: `## ${topicTitle}

This topic provides comprehensive coverage of ${topicTitle}, integrating theoretical understanding with practical applications. The content emphasizes critical thinking, analytical skills, and real-world relevance.

### Conceptual Framework

Key areas include:
- **Foundational Concepts**: Core principles and theories
- **Analytical Methods**: Critical thinking and problem-solving
- **Practical Applications**: Real-world implementations
- **Advanced Considerations**: Specialized topics and emerging trends

### Learning Objectives

Students develop:
- Comprehensive understanding of fundamental concepts
- Analytical and critical thinking skills
- Ability to apply knowledge in practical contexts
- Communication and presentation capabilities

### Applications and Examples

Real-world examples demonstrate practical relevance and career applications. Understanding these connections helps students appreciate the value of academic learning.

Mastery of ${topicTitle} provides foundation for advanced study and professional applications in related fields.`
    }
  };

  const domainTemplate = baseTemplates[nodeType]?.[domain] || baseTemplates[nodeType]?.general;
  return domainTemplate || `This section covers important concepts related to ${topicTitle}. The content provides comprehensive understanding and practical applications essential for mastering this topic.`;
};

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