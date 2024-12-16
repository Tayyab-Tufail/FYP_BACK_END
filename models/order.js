const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" }, // Optional
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" }, // Optional
  professional: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Professional",
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "ownerModel", // Dynamically set the model
    required: true,
  },
  ownerModel: {
    type: String,
    required: true,
    enum: ["Customer", "Professional"], // Either Customer or Professional can be the owner
  },
  orderType: {
    type: String,
    enum: ["Job", "Service"],
    required: true,
  },
  paymentMethod: { type: String, enum: ["COD", "Online"], required: true },
  status: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
  paymentIntentId: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
