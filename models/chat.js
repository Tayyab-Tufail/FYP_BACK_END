const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    default: null,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null,
  },
  sender: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: ["professional", "customer"],
      required: true,
    },
  },
  recipient: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: ["professional", "customer"],
      required: true,
    },
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better query performance
messageSchema.index({ job: 1, timestamp: 1 });
messageSchema.index({ "sender.id": 1, "recipient.id": 1 });
messageSchema.index({ order: 1 });

module.exports = mongoose.model("Message", messageSchema);
