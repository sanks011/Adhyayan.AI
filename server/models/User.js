const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebase_uid: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    display_name: {
      type: String,
      trim: true,
    },
    photo_url: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Remove all duplicate index definitions - let Mongoose handle unique constraints automatically
// The unique: true in the schema field definition is sufficient

module.exports = mongoose.model("User", userSchema);
