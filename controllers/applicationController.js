const Application = require("../models/application");
const Notification = require("../models/notification");
const Professional = require("../models/professional");
const Job = require("../models/job");
const Order = require("../models/order");

// @desc    Professional applies to a job
// @route   POST /api/applications/apply
// @access  Private (Professional only)
const applyToJob = async (req, res) => {
  const { jobId } = req.body; // The ID of the job
  const professionalId = req.user.id; // Logged-in professional's ID

  try {
    // Ensure the job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    // Ensure the professional exists
    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professional not found." });
    }

    // Check if the professional has already applied for this job
    const existingApplication = await Application.findOne({
      job: jobId,
      professional: professionalId,
    });

    if (existingApplication) {
      return res
        .status(400)
        .json({ message: "You have already applied for this job." });
    }

    // Create a new application
    const application = await Application.create({
      job: jobId,
      professional: professionalId,
      professionalName: professional.fullName,
      mobile: professional.mobileNumber,
      experience: professional.experience,
    });

    // Notify the job owner
    await Notification.create({
      recipient: job.postedBy,
      message: `${professional.fullName} has applied for your job "${job.title}".`,
      job: jobId, // Attach the job reference
    });

    res.status(201).json({
      message: "Application submitted successfully.",
      application,
    });
  } catch (error) {
    console.error("Error applying to job:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get applications for jobs posted by a specific user
// @route   GET /api/applications/user/:userId/applications
// @access  Private (Job Owner only)
const getJobApplications = async (req, res) => {
  const userId = req.user.id;

  try {
    const jobsPostedByUser = await Job.find({ postedBy: userId });
    const jobIds = jobsPostedByUser.map((job) => job._id);

    // Filter for applications that are not accepted
    const applications = await Application.find({
      job: { $in: jobIds },
      accepted: false, // Only get applications that are not accepted
    })
      .populate("job", "title")
      .populate("professional", "fullName mobileNumber");

    res.status(200).json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Accept an application
// @route   PUT /api/applications/:id/accept
// @access  Private (Job Owner)
const acceptApplication = async (req, res) => {
  const { id } = req.params;
  const ownerId = req.user.id.toString();
  const { userType } = req.query;

  console.log(ownerId);

  const ownerModel = userType === "professional" ? "Professional" : "Customer";
  console.log(ownerModel);

  try {
    const application = await Application.findById(id).populate("job");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.job.postedBy.toString() !== ownerId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to accept this application" });
    }

    application.accepted = true;
    await application.save();

    // Create a pending order
    const newOrder = new Order({
      job: application.job._id,
      professional: application.professional,
      owner: ownerId,
      ownerModel: ownerModel, // Ensure ownerModel is provided
      orderType: "Job",
      paymentMethod: application.job.paymentMethod,
      status: "Pending",
    });

    await newOrder.save();

    // Notify the professional
    const notification = new Notification({
      recipient: application.professional,
      message: `Your application for the job "${application.job.title}" has been accepted.`,
      job: application.job._id,
    });

    await notification.save();

    res.status(200).json({
      message:
        "Application accepted, pending order created, and professional notified",
      application,
      order: newOrder,
    });
  } catch (error) {
    console.error("Error accepting application:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Reject an application
// @route   DELETE /api/applications/:id/reject
// @access  Private (Job Owner)
const rejectApplication = async (req, res) => {
  const { id } = req.params;
  const ownerId = req.user.id.toString();
  console.log(id, ownerId);

  try {
    const application = await Application.findById(id).populate("job");
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.job.postedBy.toString() !== ownerId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to reject this application" });
    }

    await application.deleteOne(); // Delete the application

    // Send rejection notification to the professional
    const notification = new Notification({
      recipient: application.professional,
      message: `Your application for the job "${application.job.title}" has been rejected.`,
      job: application.job._id, // Add the required `job` field
    });

    await notification.save(); // Save the notification

    res.status(200).json({
      message: "Application rejected and professional notified",
    });
  } catch (error) {
    console.error("Error rejecting application:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete an application (optional, only by owner or professional)
// @route   DELETE /api/applications/:id
// @access  Private
const deleteApplication = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Ensure only the owner of the job or the professional can delete the application
    if (
      application.professional.toString() !== userId &&
      application.job.postedBy.toString() !== userId
    ) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this application" });
    }

    await application.deleteOne();
    res.status(200).json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("Error deleting application:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  applyToJob,
  getJobApplications,
  acceptApplication,
  rejectApplication,
  deleteApplication,
};
