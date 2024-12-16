const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Professional",
    required: true,
  },
  professionalName: { type: String, required: true },
  mobile: { type: String, required: true },
  experience: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now },
  accepted: { type: Boolean, default: false },
});

module.exports = mongoose.model("Application", applicationSchema);
