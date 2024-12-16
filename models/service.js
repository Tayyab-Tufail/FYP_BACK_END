const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer", // The owner of the service (customer or professional)
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["COD"], // Payment is always COD for service requirements
    default: "COD",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["open", "closed"], // Whether applications can be made
    default: "open",
  },
});

module.exports = mongoose.model("Service", serviceSchema);
