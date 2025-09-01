// routes/team.js
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Bank = require("../models/Bank");
const Withdrawal = require("../models/Withdrawal");


// Team
router.get("/team", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.redirect("/login");

    const activePayment = await Payment.findOne({
      user: user._id,
      status: "approved",
      validUntil: { $gt: new Date() }
    });

    // ✅ current user's plan size
    const userPlanSize = activePayment ? activePayment.planSize : 0;

    const totalReferralsCount = user.totalReferrals || 0;
    const verifiedReferralsCount = user.verifiedReferrals || 0;   // lifetime referrals
    const monthlyReferralsCount = user.monthlyReferrals || 0;     // resets after monthly withdrawal
    const referralAmount = user.referralAmount || 0;

    // ✅ Check if bank details exist
    const bank = await Bank.findOne({ userId: user._id });
    const bankSubmitted = !!bank;

    // ✅ Filter referrals that actually give bonus (for weekly)
    const bonusEligibleReferralsCount = user.bonusEligibleReferrals || 0;

    // ✅ WEEKLY BONUS based on referralAmount
    let weeklyTier = 0;
    let weeklyBonus = 0;
    if (referralAmount >= 5000 && referralAmount <= 9999) {
      weeklyTier = 1;
      weeklyBonus = 5000;
    } else if (referralAmount >= 10000 && referralAmount <= 19999) {
      weeklyTier = 2;
      weeklyBonus = 10000;
    } else if (referralAmount >= 20000 && referralAmount <= 49999) {
      weeklyTier = 3;
      weeklyBonus = 20000;
    } else if (referralAmount >= 50000 && referralAmount <= 99999) {
      weeklyTier = 4;
      weeklyBonus = 100000;
    } else if (referralAmount >= 100000) {
      weeklyTier = 5;
      weeklyBonus = 250000;
    }

    // ✅ MONTHLY BONUS based on monthlyReferralsCount
    let monthlyTier = 0;
    let monthlySalary = 0;
    if (monthlyReferralsCount >= 20 && monthlyReferralsCount <= 49) {
      monthlyTier = 1;
      monthlySalary = 10000;
    } else if (monthlyReferralsCount >= 50 && monthlyReferralsCount <= 99) {
      monthlyTier = 2;
      monthlySalary = 25000;
    } else if (monthlyReferralsCount >= 100 && monthlyReferralsCount <= 199) {
      monthlyTier = 3;
      monthlySalary = 50000;
    } else if (monthlyReferralsCount >= 200 && monthlyReferralsCount <= 499) {
      monthlyTier = 4;
      monthlySalary = 150000;
    } else if (monthlyReferralsCount >= 500) {
      monthlyTier = 5;
      monthlySalary = 300000;
    }

    // ✅ Get withdrawals for notifications sidebar
    const withdrawals = await Withdrawal.find({ user: user._id })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ Toast messages
    const message = req.session.message || null;
    req.session.message = null;

    res.render("team", {
      user,
      activePayment,
      totalReferralsCount,
      verifiedReferralsCount,     // lifetime
      monthlyReferralsCount,      // resets monthly
      referralAmount,
      bonusEligibleReferralsCount,
      weekly: { tier: weeklyTier, bonus: weeklyBonus },
      monthly: { tier: monthlyTier, salary: monthlySalary },
      bankSubmitted,
      message,
      withdrawals   // 🚀 pass to EJS
    });
  } catch (err) {
    console.error("Error loading team page:", err);
    res.redirect("/dashboard");
  }
});

module.exports = router;
