// routes/payment.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const Payment = require("../models/Payment");

const router = express.Router();

// Middleware to check session
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/login");
}

// Setup multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Show payment page (with history)
router.get("/payment", isAuthenticated, async (req, res) => {
  const statusFilter = req.query.status || "";
  const filter = { user: req.session.user._id };
  if (statusFilter && statusFilter !== "success" && statusFilter !== "error") {
    filter.status = statusFilter;
  }

  const payments = await Payment.find(filter).sort({ createdAt: -1 });

  res.render("payment", {
    user: req.session.user,
    payments,
    status: req.query.status || null, // pass status to template
    amount: req.query.amount || "",   // ✅ pass selected shop amount to template
    store: req.query.store || "",     // ✅ pass store to template
  });
});

// Handle payment submission
router.post(
  "/submit",
  isAuthenticated,
  upload.single("screenshot"),
  async (req, res) => {
    try {
      const { method, currency, amount, txid, store } = req.body;
      const screenshot = req.file ? `/uploads/${req.file.filename}` : null;

      // ✅ Check if user already has an active approved shop
  // REMOVED: Restriction for only one active shop. Users can now buy multiple shops.

      // Enforce minimum amount
      if (!amount || parseInt(amount) < 10000) {
        return res.redirect("/payment?status=error");
      }

      // New pending payment (approval will activate shop)
      const payment = new Payment({
        user: req.session.user._id,
        method,
        currency,
        amount,
        txid,
        store,
        screenshot,
        status: "pending",   // default state
        validUntil: null,    // set later by admin approval
        dailyEarning: 0,     // set later by admin approval
        lastPayout: null,    // set later when approved
      });

      await payment.save();

      // ✅ Referral code generation (only if user doesn’t have any yet)
      const user = await User.findById(req.session.user._id);

      if (!user.referral) {
        const code = Math.floor(10000 + Math.random() * 90000).toString();
        user.referral = code;
        await user.save();
      }

      // 🚫 Referral / bonus logic removed from here
      // ✅ This now happens only on admin approval (admin.js)

      res.redirect("/payment?status=success");
    } catch (error) {
      console.error(error);
      res.redirect("/payment?status=error");
    }
  }
);


module.exports = router;
