const mongoose = require("mongoose");
require("dotenv").config();

const setupMongoDB = async () => {
  try {
    console.log("🚀 Setting up MongoDB Atlas connection...");

    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      console.error("❌ MONGODB_URI environment variable is not set");
      console.log(
        "Please add your MongoDB Atlas connection string to the .env file:"
      );
      console.log(
        "MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/adhyayan_ai_db?retryWrites=true&w=majority"
      );
      process.exit(1);
    }

    console.log("DEBUG URI:", mongoURI);

    // Connect to MongoDB with minimal options
    await mongoose.connect(mongoURI);

    console.log("✅ Connected to MongoDB Atlas");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);

    // Import models to ensure they are registered
    console.log("🔧 Loading database models...");
    const User = require("./models/User");
    const MindMap = require("./models/MindMap");

    // Test data operations
    console.log("🧪 Testing database operations...");

    // Count existing documents
    const userCount = await User.countDocuments();
    const mindMapCount = await MindMap.countDocuments();

    console.log(
      `📊 Current data: ${userCount} users, ${mindMapCount} mind maps`
    );

    // Test creating a sample document (and then delete it)
    console.log("🧪 Testing document creation...");
    const testUser = new User({
      firebase_uid: "test_uid_" + Date.now(),
      email: "test@example.com",
      display_name: "Test User",
    });

    await testUser.save();
    console.log("✅ Test document created successfully");

    await User.deleteOne({ _id: testUser._id });
    console.log("✅ Test document deleted successfully");

    console.log("🎉 MongoDB Atlas setup completed successfully!");
    console.log("");
    console.log("Your database is ready to use. You can now:");
    console.log("1. Start your server with: npm start or npm run dev");
    console.log("2. Create user accounts through the frontend");
    console.log("3. Generate and store mind maps");
    console.log("");
  } catch (error) {
    console.error("❌ MongoDB setup failed:", error.message);

    if (error.message.includes("authentication failed")) {
      console.log("");
      console.log("Authentication failed. Please check:");
      console.log("1. Your username and password in the connection string");
      console.log("2. That your IP address is whitelisted in MongoDB Atlas");
      console.log("3. That your database user has the correct permissions");
    } else if (error.message.includes("network")) {
      console.log("");
      console.log("Network error. Please check:");
      console.log("1. Your internet connection");
      console.log("2. That your IP address is whitelisted in MongoDB Atlas");
      console.log("3. Your firewall settings");
    }

    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
};

// Run the setup
setupMongoDB();
