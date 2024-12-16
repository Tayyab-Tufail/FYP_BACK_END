// controllers/whatsappController.js
const Customer = require("../models/customer");
const Professional = require("../models/professional");

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let client;
let isInitialized = false;

const initializeWhatsApp = () => {
  return new Promise((resolve, reject) => {
    client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        args: ["--no-sandbox"],
      },
    });

    client.on("qr", (qr) => {
      console.log("QR RECEIVED", qr);
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
      console.log("Client is ready!");
      isInitialized = true;
      resolve();
    });

    client.on("auth_failure", (msg) => {
      console.error("AUTHENTICATION FAILURE", msg);
      reject(new Error("WhatsApp authentication failed"));
    });

    client.initialize().catch(reject);
  });
};

// Start initialization
initializeWhatsApp().catch(console.error);

// Temporary in-memory storage for OTPs (for demo purposes)
const otpStorage = {};

// Generate and send OTP via WhatsApp
const sendOtpWhatsApp = async (req, res) => {
  const { mobileNumber } = req.body;
  const normalizedNumber = `92${mobileNumber.slice(-10)}`; // Converts to the format for WhatsApp
  console.log(normalizedNumber);

  // Generate a 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  // Set OTP expiry time to 15 minutes
  const otpExpiryTime = 15 * 60 * 1000;
  otpStorage[normalizedNumber] = { otp, expiresAt: Date.now() + otpExpiryTime };

  try {
    const formattedNumber = `${normalizedNumber}@c.us`;

    console.log(formattedNumber);
    // Send the OTP message via WhatsApp
    await client.sendMessage(
      formattedNumber,
      `Your OTP for verification is: ${otp}`
    );
    res.status(200).json({ message: "OTP sent successfully via WhatsApp" });
  } catch (error) {
    console.error("Error sending OTP via WhatsApp:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// Verify OTP and reset password logic
const verifyOtp = async (req, res) => {
  const { mobileNumber, otp } = req.body;

  // Normalize the number by stripping non-digit characters
  const normalizedNumber = `92${mobileNumber.slice(-10)}`; // Converts to the format for WhatsApp

  console.log("OTP Storage:", otpStorage);
  console.log("Request Data - Mobile:", normalizedNumber, "OTP:", otp);

  // Check if the OTP is valid and not expired
  const storedOtp = otpStorage[normalizedNumber];
  if (!storedOtp || storedOtp.otp !== otp || Date.now() > storedOtp.expiresAt) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // OTP verified successfully, delete the OTP from storage
  delete otpStorage[normalizedNumber];

  // Return success message, allowing the user to reset their password
  res.status(200).json({
    message: "OTP verified successfully. You can now reset your password.",
  });
};

const resetPassword = async (req, res) => {
  const { mobileNumber, newPassword } = req.body;
  const normalizedNumber = `+92${mobileNumber.slice(-10)}`;
  console.log(normalizedNumber);

  try {
    const user =
      (await Customer.findOne({ mobileNumber: normalizedNumber })) ||
      (await Professional.findOne({ mobileNumber: normalizedNumber }));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { sendOtpWhatsApp, verifyOtp, resetPassword };
