// routes/authRoutes.js

const express = require("express");
const {
  registerCustomer,
  registerProfessional,
  loginCustomer,
  loginProfessional,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const router = express.Router();

// Customer routes
router.post("/customer/signup", registerCustomer);
router.post("/customer/login", loginCustomer);

// Professional routes
router.post("/professional/signup", registerProfessional);
router.post("/professional/login", loginProfessional);

router.post("/reset-password", resetPassword);

module.exports = router;
