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



    // Still get activePayment for EJS (other logic/buttons may use it)
    const activePayment = await Payment.findOne({
      user: user._id,
      status: "approved",
      validUntil: { $gt: new Date() }
    });

    // Find if user has ever bought a paid shop (not FREE)
    const paidShop = await Payment.findOne({
      user: user._id,
      status: "approved",
      store: { $ne: "FREE" }
    });
    const referralUnlocked = !!paidShop;

  const totalReferralsCount = user.totalReferrals || 0;
  const verifiedReferralsCount = user.verifiedReferrals || 0;   // lifetime referrals
  // ...existing code...
  const referralAmount = user.referralAmount || 0;
  const weeklyReferralsCount = user.weeklyReferralsCount || 0;

    // ✅ Check if bank details exist
    const bank = await Bank.findOne({ userId: user._id });
    const bankSubmitted = !!bank;

    // ✅ Filter referrals that actually give bonus (for weekly)
    const bonusEligibleReferralsCount = user.bonusEligibleReferrals || 0;

    // ✅ WEEKLY BONUS based on weeklyReferralsCount
    let weeklyTier = 0;
    let weeklyBonus = 0;
    if (weeklyReferralsCount >= 10 && weeklyReferralsCount <= 20) {
      weeklyTier = 1;
      weeklyBonus = 5000;
    } else if (weeklyReferralsCount >= 21 && weeklyReferralsCount <= 50) {
      weeklyTier = 2;
      weeklyBonus = 20000;
    } else if (weeklyReferralsCount >= 51 && weeklyReferralsCount <= 100) {
      weeklyTier = 3;
      weeklyBonus = 100000;
    } else if (weeklyReferralsCount >= 101 && weeklyReferralsCount <= 300) {
      weeklyTier = 4;
      weeklyBonus = 200000;
    } else if (weeklyReferralsCount >= 301) {
      weeklyTier = 5;
      weeklyBonus = 250000;
    } else if (weeklyReferralsCount >= 11 && weeklyReferralsCount <= 20) {
      weeklyTier = 1;
      weeklyBonus = 10000;
    }

  // ...existing code...

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
      referralUnlocked,
      totalReferralsCount,
      verifiedReferralsCount,     // lifetime
  // ...existing code...
      referralAmount,
      weeklyReferralsCount,
      bonusEligibleReferralsCount,
      weekly: { tier: weeklyTier, bonus: weeklyBonus },
  // ...existing code...
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
