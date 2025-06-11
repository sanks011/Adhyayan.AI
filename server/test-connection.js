const mongoose = require("mongoose");
require("dotenv").config();

const testConnection = async () => {
  try {
    console.log("🧪 Testing MongoDB connection...");

    const mongoURI = process.env.MONGODB_URI;
    console.log("Connection URI:", mongoURI);

    // Simple connection test
    await mongoose.connect(mongoURI);

    console.log("✅ Connection successful!");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log(`📡 Ready State: ${mongoose.connection.readyState}`); // 1 = connected

    // Test a simple operation
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      `📁 Collections: ${
        collections.map((c) => c.name).join(", ") || "None yet"
      }`
    );
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Connection closed");
  }
};

testConnection();
