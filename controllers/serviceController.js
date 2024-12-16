const Service = require("../models/service");
const Customer = require("../models/customer");
const Professional = require("../models/professional");
const Order = require("../models/order");
const Application = require("../models/application");
const Notification = require("../models/notification");

// @desc    Create a new service
// @route   POST /api/services
// @access  Private
const createService = async (req, res) => {
  const { title } = req.body;
  const userId = req.user.id; // The logged-in user's ID

  try {
    // Create a new service
    const service = await Service.create({
      title,
      owner: userId,
      paymentMethod: "COD", // Always COD
      status: "open", // Default status
    });

    // Send notification to all professionals
    const professionals = await Professional.find({}, "_id");
    const notifications = professionals.map((professional) => ({
      recipient: professional._id,
      message: `New service posted: "${title}". Check it out now!`,
      service: service._id,
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      message: "Service created successfully and notifications sent.",
      service,
    });
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// @desc    Get all services of the logged-in user
// @route   GET /api/services
// @access  Private
// @desc    Get all services of the logged-in user
// @route   GET /api/services
// @access  Private
const getServices = async (req, res) => {
  const userId = req.user.id.toString();

  try {
    const services = await Service.find({ owner: userId });

    if (!services) {
      return res.status(404).json({ message: "No services found" });
    }

    res.status(200).json(services.reverse());
  } catch (error) {
    console.error("Error fetching user services:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get open services
// @route   GET /api/services/open
// @access  Private
const getOpenServices = async (req, res) => {
  try {
    const services = await Service.find({ status: "open" }).populate(
      "owner",
      "fullName"
    );

    res.status(200).json(services.reverse());
  } catch (error) {
    console.error("Error fetching open services:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// @desc    Delete a service by ID
// @route   DELETE /api/services/:id
// @access  Private
const deleteService = async (req, res) => {
  const serviceId = req.params.id;
  const userId = req.user.id.toString();

  try {
    console.log("Delete request - ServiceID:", serviceId);
    console.log("Delete request - UserID:", userId);

    // First try to find the service
    const service = await Service.findById(serviceId);
    console.log("Found service:", service);

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
        serviceId: serviceId,
      });
    }

    // Check if user owns the service
    console.log("Service owner:", service.owner.toString());
    console.log("Request user:", userId);

    if (service.owner.toString() !== userId) {
      return res.status(403).json({
        message: "Not authorized to delete this service",
        serviceOwner: service.owner.toString(),
        requestUser: userId,
      });
    }

    // Delete the service
    await Service.deleteOne({ _id: serviceId });

    res.status(200).json({
      message: "Service deleted successfully",
      deletedService: service,
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      serviceId: serviceId,
      userId: userId,
    });
  }
};

const applyToService = async (req, res) => {
  const { serviceId } = req.body; // `serviceId` is for services only
  const professionalId = req.user.id;

  try {
    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    if (service.status !== "open") {
      return res
        .status(400)
        .json({ message: "Applications for this service are closed." });
    }

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professional not found." });
    }

    // Check if the professional has already applied
    const existingApplication = await Application.findOne({
      service: serviceId,
      professional: professionalId,
    });

    if (existingApplication) {
      return res
        .status(400)
        .json({ message: "You have already applied for this service." });
    }

    // Create a new application
    const application = await Application.create({
      service: serviceId,
      professional: professionalId,
      professionalName: professional.fullName,
      mobile: professional.mobileNumber,
      experience: professional.experience,
    });

    // Notify the service owner (customer)
    await Notification.create({
      recipient: service.owner,
      message: `${professional.fullName} has applied for your service "${service.title}".`,
      service: serviceId, // Add `service` reference, no `job`
    });

    res.status(201).json({
      message: "Application submitted successfully.",
      application,
    });
  } catch (error) {
    console.error("Error applying to service:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getServiceApplications = async (req, res) => {
  const userId = req.user.id.toString();

  try {
    // First find all services owned by the user
    const userServices = await Service.find({ owner: userId });
    const serviceIds = userServices.map((service) => service._id);

    // Then find applications for these services
    const applications = await Application.find({
      service: { $in: serviceIds },
    })
      .populate("service", "title")
      .populate("professional", "fullName mobileNumber ");

    res.status(200).json(applications);
  } catch (error) {
    console.error("Error fetching service applications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const acceptServiceApplication = async (req, res) => {
  const { applicationId } = req.body;
  const userId = req.user.id.toString();

  try {
    const application = await Application.findById(applicationId).populate(
      "service"
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    const service = application.service;

    if (service.owner.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to accept this application." });
    }

    application.accepted = true;
    await application.save();

    // Create an order for the accepted application
    const order = await Order.create({
      service: service._id, // Link the service
      professional: application.professional,
      owner: userId,
      ownerModel: "Customer",
      orderType: "Service", // Specify order type
      paymentMethod: service.paymentMethod,
      status: "Pending",
    });

    // Notify the professional
    await Notification.create({
      recipient: application.professional,
      message: `Your application for the service "${service.title}" has been accepted.`,
      service: service._id,
    });

    // Mark the service as closed
    service.status = "closed";
    await service.save();

    res.status(200).json({
      message: "Application accepted and order created.",
      order,
    });
  } catch (error) {
    console.error("Error accepting service application:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const rejectServiceApplication = async (req, res) => {
  const { applicationId } = req.body; // The application to reject
  const userId = req.user.id.toString(); // The logged-in user's ID

  try {
    const application = await Application.findById(applicationId).populate(
      "service"
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }

    const service = application.service;

    // Ensure the logged-in user is the owner of the service
    if (service.owner.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to reject this application." });
    }

    // Delete the application
    await application.deleteOne();

    // Notify the professional about the rejection
    await Notification.create({
      recipient: application.professional,
      message: `Your application for the service "${service.title}" has been rejected.`,
      service: service._id,
    });

    res
      .status(200)
      .json({ message: "Application rejected and professional notified." });
  } catch (error) {
    console.error("Error rejecting service application:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createService,
  getServices,
  getOpenServices,
  deleteService,
  applyToService,
  getServiceApplications,
  acceptServiceApplication,
  rejectServiceApplication,
};
