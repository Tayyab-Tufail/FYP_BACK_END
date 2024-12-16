// routes/profileRoutes.js
const express = require("express");
const {
  getProfile,
  updateProfile,
  changePassword,
  deleteProfile,
  getTopProfessionals,
} = require("../controllers/profileController");
const { protect } = require("../middlewares/authMiddleware"); // Ensure users are authenticated
const upload = require("../middlewares/upload");
const router = express.Router();

// Get the profile information based on user type (customer or professional)
router.get("/my-profile", protect, getProfile);

router.put("/update-profile", protect, upload.single("image"), updateProfile);

router.post("/change-password", protect, changePassword);

router.delete("/delete-profile", protect, deleteProfile);

router.get("/professionals/top", getTopProfessionals);

module.exports = router;
