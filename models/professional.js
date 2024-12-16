// models/Professional.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const professionalSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    experience: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    businessImages: [{ type: String }],
    averageRating: { type: Number, default: 0 },
    location: {
      type: String, // Location can be any string
      default: null, // Default value is null
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
professionalSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to match entered password with the hashed password
professionalSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Professional = mongoose.model("Professional", professionalSchema);

module.exports = Professional;
