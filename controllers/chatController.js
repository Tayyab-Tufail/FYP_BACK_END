const Message = require("../models/chat");
const Job = require("../models/job");
const Professional = require("../models/professional");
const Customer = require("../models/customer");
const Order = require("../models/order");

const debugActiveChats = async (userId, userType) => {
  // 1. Check if the user exists
  const Model = userType === "professional" ? Professional : Customer;
  const user = await Model.findById(userId);
  console.log("1. User check:", {
    exists: !!user,
    userId,
    userType,
    userName: user?.name,
  });

  // 2. Check all orders for this user regardless of status
  const baseOrderQuery =
    userType === "professional"
      ? { professional: userId }
      : { customer: userId };

  const allOrders = await Order.find(baseOrderQuery);
  console.log("2. All orders for user:", {
    count: allOrders.length,
    statuses: allOrders.map((order) => order.status),
  });

  // 3. Check specifically accepted orders
  const acceptedOrderQuery = {
    ...baseOrderQuery,
    status: "Completed",
  };

  const acceptedOrders = await Order.find(acceptedOrderQuery);
  console.log("3. Accepted orders:", {
    count: acceptedOrders.length,
    orderIds: acceptedOrders.map((order) => order._id),
  });

  // 4. Check if these orders have associated jobs
  if (acceptedOrders.length > 0) {
    const jobIds = acceptedOrders.map((order) => order.job);
    const jobs = await Job.find({ _id: { $in: jobIds } });
    console.log("4. Associated jobs:", {
      expectedCount: acceptedOrders.length,
      foundCount: jobs.length,
      jobIds: jobs.map((job) => job._id),
    });
  }

  return {
    userExists: !!user,
    totalOrders: allOrders.length,
    acceptedOrders: acceptedOrders.length,
  };
};

// @desc    Get all active chats for logged-in user
// @route   GET /api/chats/active
// @access  Private
const getActiveChats = async (req, res) => {
  const { userId, userType } = req.query;

  if (!userId || !userType) {
    return res.status(400).json({ message: "Missing user information" });
  }

  try {
    // Get messages and create initial uniqueChats map
    const messages = await Message.find({
      $or: [{ "sender.id": userId }, { "recipient.id": userId }],
    }).sort({ timestamp: -1 });

    const uniqueChats = new Map();

    messages.forEach((msg) => {
      const partnerId =
        msg.sender.id.toString() === userId
          ? msg.recipient.id.toString()
          : msg.sender.id.toString();

      const chatKey = msg.order ? `order_${msg.order}` : `direct_${partnerId}`;

      if (!uniqueChats.has(chatKey)) {
        uniqueChats.set(chatKey, {
          partnerId,
          orderId: msg.order,
          lastMessage: {
            content: msg.content,
            timestamp: msg.timestamp,
          },
        });
      }
    });

    // Get orders
    const orderQuery =
      userType === "professional"
        ? {
            $or: [
              { professional: userId },
              { owner: userId, ownerModel: "Professional" },
            ],
            status: { $in: ["Pending", "Completed"] },
          }
        : {
            $or: [
              { customer: userId },
              { owner: userId, ownerModel: "Customer" },
            ],
            status: { $in: ["Pending", "Completed"] },
          };

    const orders = await Order.find(orderQuery)
      .populate("job", "title description")
      .populate("service", "title description")
      .populate("professional", "fullName name image")
      .populate("owner", "fullName name image");

    // Add orders to uniqueChats if not already present
    orders.forEach((order) => {
      const chatKey = `order_${order._id}`;
      if (!uniqueChats.has(chatKey)) {
        const partnerId =
          userType === "professional"
            ? order.owner._id.toString()
            : order.professional._id.toString();

        uniqueChats.set(chatKey, {
          partnerId,
          orderId: order._id,
          lastMessage: null,
        });
      }
    });

    // Build final chat list
    const activeChats = await Promise.all(
      Array.from(uniqueChats.values()).map(
        async ({ partnerId, orderId, lastMessage }) => {
          const order = orders.find((o) => o._id.toString() === orderId);
          let partner;

          if (order) {
            partner =
              userType === "professional" ? order.owner : order.professional;
          } else {
            partner = await getUserDetails(
              partnerId,
              order?.professional?._id.toString() === partnerId
                ? "professional"
                : "customer"
            );
          }

          return {
            id: orderId ? `order_${orderId}` : `direct_${partnerId}`,
            orderId: orderId || null,
            orderType: order?.orderType || "direct",
            details: order
              ? {
                  _id: order.job?._id || order.service?._id,
                  title: order.job?.title || order.service?.title,
                  description:
                    order.job?.description || order.service?.description,
                  status: order.status,
                }
              : null,
            chatPartner: {
              _id: partner._id,
              name: partner.fullName || partner.name,
              profileImage: partner.image,
              type: partner.type,
            },
            lastMessage,
          };
        }
      )
    );

    res.status(200).json(activeChats.filter((chat) => chat !== null));
  } catch (error) {
    console.error("Error fetching active chats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getUserDetails = async (userId, userType) => {
  try {
    let user;
    if (userType === "professional") {
      user = await Professional.findById(userId);
      if (!user) {
        user = await Customer.findById(userId); // Check in Customer collection if not found
      }
    } else {
      user = await Customer.findById(userId);
      if (!user) {
        user = await Professional.findById(userId); // Check in Professional collection if not found
      }
    }

    if (!user) {
      console.error(`User not found: ${userId} of type ${userType}`);
      throw new Error(`User not found: ${userId}`);
    }

    return user;
  } catch (error) {
    console.error(
      `Error getting user details for userId: ${userId}, userType: ${userType}`
    );
    throw error;
  }
};

// @desc    Get chat history for a job
// @route   GET /api/chats/:jobId
// @access  Private
const getChatHistory = async (req, res) => {
  const { recipientId } = req.query; // Get recipientId from query params
  const userId = req.user.id; // Logged-in user ID

  try {
    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }

    // Fetch all messages between the sender and the recipient
    const messages = await Message.find({
      $or: [
        { "sender.id": userId, "recipient.id": recipientId },
        { "sender.id": recipientId, "recipient.id": userId },
      ],
    }).sort({ timestamp: 1 }); // Sort by timestamp (oldest first)

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Send a message
// @route   POST /api/chats/send
// @access  Private
const sendMessage = async (req, res) => {
  const { recipientId, content, jobId, orderId, userType } = req.body;
  const userId = req.user.id;

  try {
    const message = await Message.create({
      job: jobId || null,
      order: orderId || null,
      sender: { id: userId, type: userType },
      recipient: {
        id: recipientId,
        type: userType === "professional" ? "customer" : "professional",
      },
      content,
      timestamp: new Date(),
    });

    res
      .status(201)
      .json({ message: "Message sent successfully", data: message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const initiateChat = async (req, res) => {
  const { recipientId, recipientType, content, userType } = req.body;
  const userId = req.user.id;

  try {
    const initialMessage = await Message.create({
      sender: { id: userId, type: userType },
      recipient: { id: recipientId, type: recipientType },
      content: content || "Chat initiated", // Default content for new chat
      timestamp: new Date(),
    });

    res.status(201).json({
      message: "Chat initiated successfully",
      data: initialMessage,
    });
  } catch (error) {
    console.error("Error initiating chat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getActiveChats,
  sendMessage,
  getChatHistory,
  initiateChat,
};
