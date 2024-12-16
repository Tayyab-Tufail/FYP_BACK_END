const express = require("express");
const {
  postJob,
  getAllJobs,
  getMyJobs,
  deleteJob,
} = require("../controllers/jobController");
const { protect } = require("../middlewares/authMiddleware"); // Assuming you have an auth middleware
const upload = require("../middlewares/upload"); // Assuming you have middleware for file uploads

const router = express.Router();

// Route to post a new job (only authenticated users)
router.post("/", protect, upload.array("images", 10), postJob);

// Get all jobs posted by the logged-in user
router.get("/my-jobs", protect, getMyJobs);

// Route to get all jobs (public)
router.get("/", getAllJobs);

// Route to delete a job (only job owners)
router.delete("/:id", protect, deleteJob);

module.exports = router;
