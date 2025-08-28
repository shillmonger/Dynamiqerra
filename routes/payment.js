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
      const activePayment = await Payment.findOne({
        user: req.session.user._id,
        status: "approved",
        validUntil: { $gt: new Date() }
      });

      if (activePayment) {
        return res.redirect("/payment?status=active_exists");
      }

      // Enforce minimum amount
      if (!amount || parseInt(amount) < 10000) {
        return res.redirect("/payment?status=error");
      }

      const payment = new Payment({
        user: req.session.user._id,
        method,
        currency,
        amount,
        txid,
        store,
        screenshot,
      });

      await payment.save();

      // ✅ Referral code generation (only if user doesn’t have any yet)
      const user = await User.findById(req.session.user._id);

      if (!user.referral) {
        const code = Math.floor(10000 + Math.random() * 90000).toString();
        user.referral = code;
        await user.save();
      }

      // ✅ Reward referrer if exists
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          const bonus = parseInt(amount) * 0.1; // 10% referral bonus

          // Update referrer’s direct earnings
          referrer.referralEarnings += bonus;
          referrer.balance += bonus;

          // 🔥 Only update verifiedReferrals here
          referrer.verifiedReferrals = (referrer.verifiedReferrals || 0) + 1;
          referrer.referralAmount = (referrer.verifiedReferrals || 0) * 1000;

          // Recalculate weekly bonus
          let verifiedCount = referrer.verifiedReferrals;
          let newWeeklyBonus = 0;
          if (verifiedCount >= 100) newWeeklyBonus = 250000;
          else if (verifiedCount >= 50) newWeeklyBonus = 100000;
          else if (verifiedCount >= 20) newWeeklyBonus = 20000;
          else if (verifiedCount >= 10) newWeeklyBonus = 10000;
          else if (verifiedCount >= 5) newWeeklyBonus = 5000;

          // ✅ Add only the difference in weekly bonus to balance
          if (newWeeklyBonus > (referrer.weeklyBonus || 0)) {
            const diff = newWeeklyBonus - (referrer.weeklyBonus || 0);
            referrer.balance += diff;
          }

          referrer.weeklyBonus = newWeeklyBonus;

          await referrer.save();
        }
      }

      res.redirect("/payment?status=success");
    } catch (error) {
      console.error(error);
      res.redirect("/payment?status=error");
    }
  }
);

module.exports = router;
