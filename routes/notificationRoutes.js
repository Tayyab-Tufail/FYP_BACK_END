const express = require("express");
const router = express.Router();
const {
  getNotifications,
  deleteNotification,
} = require("../controllers/notificationController");
const { protect } = require("../middlewares/authMiddleware");

// Routes
router.get("/", protect, getNotifications); // Get all notifications for the logged-in professional
router.delete("/:id", protect, deleteNotification); // Delete a specific notification

module.exports = router;
