const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  applyToJob,
  getJobApplications,
  acceptApplication,
  rejectApplication,
  deleteApplication,
} = require("../controllers/applicationController");

// Professional applies to a job
router.post("/apply", protect, applyToJob);

// Job owner gets all applications for their job
router.get("/user/:userId/applications", protect, getJobApplications);

// Accept an application
router.post("/application/:id/accept", protect, acceptApplication);

// Reject an application
router.post("/application/:id/reject", protect, rejectApplication);

// Delete an application (optional use case)
router.delete("/application/:id", protect, deleteApplication);

module.exports = router;
