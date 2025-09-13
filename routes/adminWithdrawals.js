// routes/adminWithdrawals.js
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const Withdrawal = require("../models/Withdrawal");

// Middleware: only admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.isAdmin) return next();
  return res.redirect("/login");
};

// Admin view all withdrawals
router.get("/admin/withdrawals", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate("user")
      .sort({ createdAt: -1 });

    res.render("adminWithdrawals", { withdrawals });
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
});

// Approve withdrawal
router.post("/admin/withdrawals/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate("user");
    if (!withdrawal || withdrawal.status !== "pending") return res.redirect("/admin/withdrawals");

    const user = withdrawal.user;

      if (withdrawal.type === "referral") {
        // Reset referral amount after approval
        user.referralAmount = 0;
      } else if (withdrawal.type === "weekly") {
        // Weekly salary: reset weeklyReferralsCount and bonusEligibleReferrals
        user.weeklyReferralsCount = 0;
        user.bonusEligibleReferrals = 0;
      }

    await user.save();

    withdrawal.status = "approved";
    await withdrawal.save();

    res.redirect("/admin/withdrawals");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/withdrawals");
  }
});



// Decline withdrawal
router.post("/admin/withdrawals/:id/decline", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal || withdrawal.status !== "pending") return res.redirect("/admin/withdrawals");

    withdrawal.status = "declined";
    await withdrawal.save();

    res.redirect("/admin/withdrawals");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/withdrawals");
  }
});

module.exports = router;
