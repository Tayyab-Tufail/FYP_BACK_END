const cloudinary = require("../config/cloudinary");
const Customer = require("../models/customer");
const Professional = require("../models/professional");

const uploadBusinessImages = async (req, res) => {
  const { userType } = req.body; // Determine if it's a customer or professional
  const userId = req.user.id.toString();
  console.log(userId, userType);
  try {
    let user;
    if (userType === "customer") {
      user = await Customer.findById(userId);
    } else if (userType === "professional") {
      user = await Professional.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(user);

    // Check if files are uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Array to store URLs of uploaded images
    const imageUrls = [];

    // Loop through the files and upload them to Cloudinary
    for (let file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "business_images",
      });
      imageUrls.push(result.secure_url);
    }

    // Add the image URLs to the user's businessImages array
    user.businessImages = user.businessImages.concat(imageUrls);
    console.log("after");

    // Save the updated user
    await user.save();

    res.status(200).json({
      message: "Images uploaded successfully",
      images: imageUrls,
      user,
    });
  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getApplicantImages = async (req, res) => {
  const { userId, userType } = req.params;

  if (!userType || !["professional", "customer"].includes(userType)) {
    return res.status(400).json({ message: "Invalid or missing userType" });
  }

  try {
    const user =
      userType === "professional"
        ? await Professional.findById(userId).select("businessImages")
        : await Customer.findById(userId).select("businessImages");

    if (!user) {
      return res.status(404).json({ message: `${userType} not found` });
    }

    res.status(200).json(user.businessImages || []);
  } catch (error) {
    console.error("Error fetching applicant images:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const rateProfessional = async (req, res) => {
  const { professionalId } = req.params;
  const { rating } = req.body;

  try {
    // Validate rating value
    if (rating < 0 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 0 and 5" });
    }

    // Find the professional
    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professional not found" });
    }

    // Calculate new average rating
    // If there's no previous rating, set it directly
    if (!professional.averageRating) {
      professional.averageRating = rating;
    } else {
      // Calculate running average
      // New average = (current average + new rating) / 2
      professional.averageRating = Number(
        ((professional.averageRating + rating) / 2).toFixed(1)
      );
    }

    // Save the updated rating
    await professional.save();

    res.status(200).json({
      message: "Rating submitted successfully",
      averageRating: professional.averageRating,
    });
  } catch (error) {
    console.error("Error submitting rating:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { uploadBusinessImages, getApplicantImages, rateProfessional };
