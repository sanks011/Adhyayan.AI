const mongoose = require("mongoose");

const mindMapSchema = new mongoose.Schema(
  {
    user_uid: {
      type: String,
      required: true,
      index: true, // Simple index, not unique
    },
    subject_name: {
      type: String,
      required: true,
      trim: true,
    },
    syllabus: {
      type: String,
      required: true,
    },
    mindmap_data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Only define indexes once - removed duplicate index definitions
mindMapSchema.index({ user_uid: 1, created_at: -1 });
mindMapSchema.index({ subject_name: "text" }); // Text search index

module.exports = mongoose.model("MindMap", mindMapSchema);
