const Job = require("../models/job");
const cloudinary = require("../config/cloudinary");
const Notification = require("../models/notification");
const Professional = require("../models/professional");
const Application = require("../models/application");

// @desc    Post a new job
// @route   POST /api/jobs
// @access  Private
const postJob = async (req, res) => {
  const { title, description, category, location, userType, paymentMethod } =
    req.body;
  const userId = req.user.id; // Assume the authenticated user is attached to req.user

  try {
    // Validate required fields
    if (!title || !description || !category || !paymentMethod) {
      return res
        .status(400)
        .json({ message: "Please fill in all required fields" });
    }

    // Prepare job data
    const jobData = {
      title,
      description,
      category,
      location,
      postedBy: userId, // ID of the logged-in customer
      userType,
      paymentMethod,
    };

    // Handle file uploads (optional images)
    if (req.files && req.files.length > 0) {
      const uploadResults = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, { folder: "job_images" })
        )
      );
      jobData.images = uploadResults.map((result) => result.secure_url);
    }

    // Save the job in the database
    const newJob = new Job(jobData);
    await newJob.save();

    // Find all professionals to notify them about the new job
    const professionals = await Professional.find(); // Query Professional collection

    // Create notifications for all professionals
    const notifications = professionals.map((professional) => ({
      recipient: professional._id,
      message: `A new job "${title}" has been posted.`,
      job: newJob._id,
    }));

    // Bulk insert notifications into the database
    await Notification.insertMany(notifications);

    res.status(201).json({ message: "Job posted successfully", job: newJob });
  } catch (error) {
    console.error("Error posting job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
const getAllJobs = async (req, res) => {
  try {
    // Find jobs with no accepted applications
    const jobs = (await Job.find().lean()).reverse(); // Retrieve jobs in plain JavaScript objects for efficient filtering

    const unacceptedJobs = await Promise.all(
      jobs.map(async (job) => {
        const acceptedApplications = await Application.findOne({
          job: job._id,
          accepted: true,
        });
        return acceptedApplications ? null : job; // Only return job if no accepted applications exist
      })
    );

    // Filter out any null results (jobs with accepted applications)
    const filteredJobs = unacceptedJobs.filter((job) => job !== null);

    res.status(200).json(filteredJobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all jobs posted by the logged-in user
// @route   GET /api/jobs/my-jobs
// @access  Private
const getMyJobs = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from the token payload

    // Find jobs where postedBy matches the logged-in user's ID
    const jobs = await Job.find({ postedBy: userId });

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ message: "No jobs found for this user" });
    }

    res.status(200).json(jobs);
  } catch (error) {
    console.error("Error fetching user jobs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a job
// @route   DELETE /api/jobs/:id
// @access  Private
const deleteJob = async (req, res) => {
  const jobId = req.params.id;
  const userId = req.user.id.toString(); // Logged-in user

  try {
    // Find the job by ID
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Check if the logged-in user is the owner of the job
    if (job.postedBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this job" });
    }

    // Delete the job
    await job.deleteOne();
    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { postJob, getAllJobs, deleteJob, getMyJobs };
