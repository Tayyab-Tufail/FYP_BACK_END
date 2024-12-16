const express = require("express");

const {
  uploadBusinessImages,
  getApplicantImages,
  rateProfessional,
} = require("../controllers/businessImagesController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

const router = express.Router();

// Route to upload multiple images
router.post(
  "/upload-business-images",
  protect,
  upload.array("images", 10),
  uploadBusinessImages
);

router.get("/portfolio/:userType/:userId", protect, getApplicantImages);

router.post("/professionals/:professionalId/rate", protect, rateProfessional);

module.exports = router;
