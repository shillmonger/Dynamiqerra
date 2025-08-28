// routes/team.js
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const Payment = require("../models/Payment");

// Team
router.get("/team", isAuthenticated, async (req, res) => {
  try {
    // get fresh user
    const user = await User.findById(req.session.user._id);

    if (!user) {
      return res.redirect("/login");
    }

    // ✅ active subscription
    const activePayment = await Payment.findOne({
      user: user._id,
      status: "approved",
      validUntil: { $gt: new Date() }
    });

    // ✅ Use values already stored in User model
    const totalReferralsCount = user.totalReferrals || 0;
    const verifiedReferralsCount = user.verifiedReferrals || 0;
    const referralAmount = user.referralAmount || 0;
    let weeklyBonus = user.weeklyBonus || 0;

    // ✅ Recalculate bonus in case referrals increased since last update
    if (verifiedReferralsCount >= 100) weeklyBonus = 250000;
    else if (verifiedReferralsCount >= 50) weeklyBonus = 100000;
    else if (verifiedReferralsCount >= 20) weeklyBonus = 20000;
    else if (verifiedReferralsCount >= 10) weeklyBonus = 10000;
    else if (verifiedReferralsCount >= 5) weeklyBonus = 5000;
    else weeklyBonus = 0;

    // ✅ Withdrawal eligibility (weekly cooldown)
    let canWithdraw = false;
    if (weeklyBonus > 0) {
      const now = new Date();
      const last = user.lastReferralWithdrawal || new Date(0); // fallback old date
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (last < oneWeekAgo) {
        canWithdraw = true;
      }
    }

    // ✅ Update user.weeklyBonus in DB so it's always current
    if (user.weeklyBonus !== weeklyBonus) {
      user.weeklyBonus = weeklyBonus;
      await user.save();
    }

    res.render("team", {
      user,
      activePayment,
      totalReferralsCount,
      verifiedReferralsCount,
      referralAmount,
      weeklyBonus,
      canWithdraw
    });
  } catch (err) {
    console.error("Error loading team page:", err);
    res.redirect("/dashboard");
  }
});

module.exports = router;
