// controllers/profileController.js
const Customer = require("../models/customer.js");
const Professional = require("../models/professional.js");
const cloudinary = require("../config/cloudinary");

// @desc    Get the profile of the authenticated user
// @route   GET /api/profile/my-profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const { id, userType } = req.user; // Assuming the auth middleware sets `req.user`

    let userProfile;

    if (userType === "customer") {
      // Fetch customer data
      userProfile = await Customer.findById(id).select("-password"); // Exclude password
    } else if (userType === "professional") {
      // Fetch professional data
      userProfile = await Professional.findById(id).select("-password"); // Exclude password
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }

    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user: userProfile, userType });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  const { fullName, gender, mobileNumber, experience, userType, location } =
    req.body;
  const userId = req.user.id.toString();

  try {
    let user;

    // Fetch the logged-in user based on userType and ID from the token
    if (userType === "customer") {
      user = await Customer.findById(userId);
    } else if (userType === "professional") {
      user = await Professional.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the new mobile number already exists
    if (mobileNumber) {
      const existingUser =
        (await Customer.findOne({ mobileNumber })) ||
        (await Professional.findOne({ mobileNumber }));
      if (existingUser && existingUser._id.toString() !== userId) {
        return res
          .status(400)
          .json({ message: "Mobile number already in use" });
      }
    }

    // Update basic fields
    if (fullName) user.fullName = fullName;
    if (gender) user.gender = gender;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (experience) user.experience = experience;

    // Update location for professionals only
    if (userType === "professional" && location) {
      user.location = location;
    }

    // Handle image upload
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_pictures",
      });
      user.image = result.secure_url;
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword, userType } = req.body;
  const userId = req.user.id; // Get the user ID from the token

  try {
    let user;

    // Find the user based on userType and ID
    if (userType === "customer") {
      user = await Customer.findById(userId);
    } else if (userType === "professional") {
      user = await Professional.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the old password matches the current password
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Update to the new password (hash will be applied automatically)
    user.password = newPassword;
    await user.save(); // Save the updated user with the new password

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteProfile = async (req, res) => {
  const { mobileNumber, userType } = req.body; // Get mobile number and user type from request body
  const loggedInMobileNumber = req.user.mobileNumber; // Get logged-in user's mobile number from JWT

  try {
    // Check if the mobile number provided matches the logged-in user's mobile number
    if (mobileNumber !== loggedInMobileNumber) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this profile" });
    }

    let user;
    // Delete profile based on userType (customer or professional)
    if (userType === "customer") {
      user = await Customer.findOneAndDelete({
        mobileNumber: loggedInMobileNumber,
      });
    } else if (userType === "professional") {
      user = await Professional.findOneAndDelete({
        mobileNumber: loggedInMobileNumber,
      });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getTopProfessionals = async (req, res) => {
  const { location } = req.query; // Location filter
  console.log(location);

  try {
    // Construct the query object
    const query = location ? { location: new RegExp(location, "i") } : {};

    // Fetch top 10 professionals sorted by averageRating
    const professionals = await Professional.find(query)
      .sort({ averageRating: -1 })
      .limit(5);

    res.status(200).json(professionals);
  } catch (error) {
    console.error("Error fetching professionals:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteProfile,
  getTopProfessionals,
};
