const express = require("express");
const {
  createService,
  getServices,
  getOpenServices,
  deleteService,
  applyToService,
  getServiceApplications,
  acceptServiceApplication,
  rejectServiceApplication,
} = require("../controllers/serviceController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Create a new service
router.post("/", protect, createService);

// Get all services for the logged-in user
router.get("/", protect, getServices);

router.get("/open", getOpenServices);

// Delete a service by ID
router.delete("/:id", protect, deleteService);

router.post("/apply", protect, applyToService); // Apply to a service

router.get("/applications", protect, getServiceApplications);

router.post("/applications/accept", protect, acceptServiceApplication); // Accept an application

router.post("/applications/reject", protect, rejectServiceApplication); // reject an application

module.exports = router;