const Notification = require("../models/notification");

// @desc    Get all notifications for the logged-in professional
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ recipient: userId })
      .populate("job", "title description")
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a notification for the logged-in professional
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id.toString();

  try {
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.recipient.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this notification" });
    }

    await notification.deleteOne();
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getNotifications, deleteNotification };
