const express = require("express");
const router = express.Router();
const {
  completeOrder,
  rateOrder,
  getOrdersByStatus,
  updateOrderAfterPayment,
  getAllOrders,
} = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");

// Mark an order as completed
router.post("/:id/complete", protect, completeOrder);
router.post("/:id/payment-complete", protect, updateOrderAfterPayment);
router.post("/:id/rate", protect, rateOrder);
router.get("/", protect, getOrdersByStatus);
router.get("/all", getAllOrders);

module.exports = router;
