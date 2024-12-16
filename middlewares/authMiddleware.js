const jwt = require("jsonwebtoken");
const Customer = require("../models/customer");
const Professional = require("../models/professional");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user =
        (await Customer.findById(decoded.id)) ||
        (await Professional.findById(decoded.id));
      if (!user) return res.status(404).json({ message: "User not found" });

      req.user = {
        id: user._id,
        mobileNumber: user.mobileNumber,
        userType: user instanceof Customer ? "customer" : "professional",
      };

      next();
    } catch (error) {
      console.error("Token authentication error:", error);
      return res.status(401).json({ message: "Not authorized" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
