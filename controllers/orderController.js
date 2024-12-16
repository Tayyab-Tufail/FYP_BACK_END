const Order = require("../models/order");
const stripe = require("../config/stripe");
const Professional = require("../models/professional");
const Customer = require("../models/customer");
const Service = require("../models/service");
const Job = require("../models/job");

// Utility function to dynamically load the model (Job or Service)
const getModelByType = (type) => {
  if (type === "Job") return Job;
  if (type === "Service") return Service;
  throw new Error("Invalid reference type");
};

// @desc    Mark order as completed
// @route   POST /api/orders/:id/complete
// @access  Private (Owner only)
const completeOrder = async (req, res) => {
  const { id } = req.params; // Order ID
  const { price, paymentMethodType } = req.body;
  const ownerId = req.user.id.toString();

  try {
    const order = await Order.findById(id).populate("job service");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.owner.toString() !== ownerId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to mark this order as completed" });
    }

    if (order.paymentMethod === "Online") {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price * 100, // Convert to cents
        currency: "usd",
        payment_method_types: [paymentMethodType || "card"],
        metadata: {
          orderId: id,
        },
      });

      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } else {
      order.status = "Completed";
      await order.save();
      res
        .status(200)
        .json({ message: "Order completed and moved to past orders", order });
    }
  } catch (error) {
    console.error("Error completing order:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Fetch all orders
// @route   GET /api/orders/all
// @access  Public
const getAllOrders = async (req, res) => {
  const { status, orderType } = req.query; // Optional filters

  try {
    // Construct a query object based on filters
    const query = {};
    if (status) query.status = status; // e.g., "Pending", "Completed"
    if (orderType) query.orderType = orderType; // e.g., "Job", "Service"

    // Fetch orders with optional filters
    const orders = await Order.find(query)
      .populate("job", "title description")
      .populate("service", "title description")
      .populate("professional", "fullName email")
      .populate("owner", "fullName email");

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update order status after successful payment
// @route   POST /api/orders/:id/update-payment
// @access  Private
const updateOrderAfterPayment = async (req, res) => {
  const { id } = req.params; // Order ID
  const { paymentIntentId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        message: "Payment has not been completed successfully",
      });
    }

    const order = await Order.findById(id)
      .populate("owner")
      .populate("professional")
      .populate("job service");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const ownerModel =
      order.owner instanceof Customer ? "Customer" : "Professional";

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        status: "Completed",
        paymentIntentId,
        ownerModel,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Rate an order
// @route   POST /api/orders/:id/rate
// @access  Private (Owner only)
const rateOrder = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  const ownerId = req.user.id.toString();

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.owner.toString() !== ownerId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to rate this order" });
    }

    if (order.status !== "Completed") {
      return res
        .status(400)
        .json({ message: "Only completed orders can be rated" });
    }

    order.rating = rating;
    await order.save();

    const professional = await Professional.findById(order.professional);
    const allRatings = await Order.find({
      professional: professional._id,
      rating: { $exists: true },
    });

    const averageRating =
      allRatings.reduce((sum, o) => sum + o.rating, 0) / allRatings.length;

    professional.averageRating = averageRating.toFixed(1);
    await professional.save();

    res.status(200).json({ message: "Rating submitted successfully", order });
  } catch (error) {
    console.error("Error submitting rating:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get orders by status
// @route   GET /api/orders
// @access  Private
const getOrdersByStatus = async (req, res) => {
  const userId = req.user.id.toString();
  const status = req.query.status;

  try {
    const isCustomer = await Customer.findById(userId);
    const isProfessional = await Professional.findById(userId);

    if (!isCustomer && !isProfessional) {
      return res
        .status(404)
        .json({ message: "User not found or invalid user type." });
    }

    const orders = await Order.find({
      $or: [{ owner: userId }, { professional: userId }],
      status,
    })
      .populate("job service")
      .populate("professional", "fullName mobileNumber")
      .populate("owner", "fullName mobileNumber");

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  completeOrder,
  updateOrderAfterPayment,
  rateOrder,
  getOrdersByStatus,
  getAllOrders,
};
