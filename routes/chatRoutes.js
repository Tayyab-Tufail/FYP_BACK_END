const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  getActiveChats,
  sendMessage,
  getChatHistory,
  initiateChat,
} = require("../controllers/chatController");

// Protect all routes
router.use(protect);

// Chat routes
router.get("/active", getActiveChats);
router.get("/:jobId", getChatHistory);
router.post("/send", sendMessage);
router.post("/initiate", initiateChat);

module.exports = router;
