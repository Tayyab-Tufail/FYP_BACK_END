const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    location: {
      type: String, // This is optional
    },
    images: [
      {
        type: String, // URLs for images, these are optional
      },
    ],
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "userType", // Will reference either Customer or Professional based on userType
    },
    userType: {
      type: String,
      required: true,
      enum: ["customer", "professional"], // This allows either Customer or Professional
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Online"],
      required: true,
    },
  },
  { timestamps: true } // Automatically manages `createdAt` and `updatedAt`
);

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;
