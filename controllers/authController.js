// controllers/authController.js
const jwt = require("jsonwebtoken");
const Customer = require("../models/customer.js");
const Professional = require("../models/professional.js");
const bcrypt = require("bcryptjs");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d", // Token will expire in 30 days
  });
};

// @desc    Register a new customer
// @route   POST /api/auth/customer/signup
// @access  Public
const registerCustomer = async (req, res) => {
  const { fullName, mobileNumber, password, gender, image } = req.body;

  // Check if the customer already exists
  const customerExists = await Customer.findOne({ mobileNumber });

  if (customerExists) {
    return res.status(400).json({ message: "Customer already exists" });
  }

  // Create a new customer
  const customer = await Customer.create({
    fullName,
    mobileNumber,
    password,
    gender,
    image,
  });

  if (customer) {
    res.status(201).json({
      _id: customer._id,
      fullName: customer.fullName,
      mobileNumber: customer.mobileNumber,
    });
  } else {
    res.status(400).json({ message: "Invalid customer data" });
  }
};

// @desc    Register a new professional
// @route   POST /api/auth/professional/signup
// @access  Public
const registerProfessional = async (req, res) => {
  const { fullName, mobileNumber, password, gender, experience, image } =
    req.body;

  // Check if the professional already exists
  const professionalExists = await Professional.findOne({ mobileNumber });

  if (professionalExists) {
    return res.status(400).json({ message: "Professional already exists" });
  }

  // Create a new professional
  const professional = await Professional.create({
    fullName,
    mobileNumber,
    password,
    gender,
    experience,
    image,
  });

  if (professional) {
    res.status(201).json({
      _id: professional._id,
      fullName: professional.fullName,
      mobileNumber: professional.mobileNumber,
    });
  } else {
    res.status(400).json({ message: "Invalid professional data" });
  }
};

// @desc    Customer Login
// @route   POST /api/auth/customer/login
// @access  Public
const loginCustomer = async (req, res) => {
  const { mobileNumber, password } = req.body;

  // Find the customer by mobile number
  const customer = await Customer.findOne({ mobileNumber });

  if (customer && (await customer.matchPassword(password))) {
    res.json({
      _id: customer._id,
      fullName: customer.fullName,
      mobileNumber: customer.mobileNumber,
      experience: customer.experience,
      gender: customer.gender,
      token: generateToken(customer._id), // Send JWT Token
    });
  } else {
    res.status(401).json({ message: "Invalid mobile number or password" });
  }
};

// @desc    Professional Login
// @route   POST /api/auth/professional/login
// @access  Public
const loginProfessional = async (req, res) => {
  const { mobileNumber, password } = req.body;

  // Find the professional by mobile number
  const professional = await Professional.findOne({ mobileNumber });

  if (professional && (await professional.matchPassword(password))) {
    res.json({
      _id: professional._id,
      fullName: professional.fullName,
      mobileNumber: professional.mobileNumber,
      experience: professional.experience,
      gender: professional.gender,
      location: professional.location,
      image: professional.image,
      token: generateToken(professional._id), // Send JWT Token
    });
  } else {
    res.status(401).json({ message: "Invalid mobile number or password" });
  }
};

// Reset password after OTP verification
const resetPassword = async (req, res) => {
  const { mobileNumber, newPassword, userType } = req.body;

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  try {
    let user;
    if (userType === "customer") {
      // Find the customer by mobile number
      user = await Customer.findOne({ mobileNumber: mobileNumber });
    } else if (userType === "professional") {
      // Find the professional by mobile number
      user = await Professional.findOne({ mobileNumber: mobileNumber });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's password with the new hashed password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerCustomer,
  registerProfessional,
  loginCustomer,
  loginProfessional,
  resetPassword,
};
