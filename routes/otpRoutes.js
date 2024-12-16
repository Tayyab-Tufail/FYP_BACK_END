// routes/whatsappRoutes.js
const express = require("express");
const {
  sendOtpWhatsApp,
  verifyOtp,
  resetPassword,
} = require("../controllers/otpController");
const router = express.Router();

// Route to send OTP via WhatsApp
router.post("/send-otp", sendOtpWhatsApp);

// Route to verify OTP and reset password
router.post("/verify-otp", verifyOtp);

router.post("/reset-password", resetPassword);

module.exports = router;
