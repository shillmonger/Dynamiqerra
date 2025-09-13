// routes/withdrawals.js
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const Withdrawal = require("../models/Withdrawal");
const Bank = require("../models/Bank");

// POST /team/withdraw
router.post("/team/withdraw", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.status(401).json({ success: false, message: "Not logged in" });

    const { type } = req.body; // 'referral' or 'weekly'
    let amount = 0;
    const today = new Date();

    // 🚫 Restrict withdrawals on Sundays
    if (today.getDay() === 0) {
      return res.json({ success: false, message: "Withdrawals are not allowed on Sundays." });
    }

    // ✅ Referral withdrawal
    if (type === "referral") {
      const referralAmount = user.referralAmount || 0;
      if (referralAmount < 1000) {
        return res.json({ success: false, message: "Minimum withdrawal is ₦1,000." });
      }
      amount = referralAmount; // withdraw full referral balance
    // ✅ Weekly withdrawal
    } else if (type === "weekly") {
      const weeklyReferralsCount = user.weeklyReferralsCount || 0;
      if (weeklyReferralsCount >= 10 && weeklyReferralsCount <= 20) {
        amount = 5000;
      } else if (weeklyReferralsCount >= 21 && weeklyReferralsCount <= 50) {
        amount = 20000;
      } else if (weeklyReferralsCount >= 51 && weeklyReferralsCount <= 100) {
        amount = 100000;
      } else if (weeklyReferralsCount >= 101 && weeklyReferralsCount <= 300) {
        amount = 200000;
      } else if (weeklyReferralsCount >= 301) {
        amount = 250000;
      }
      if (amount <= 0) {
        return res.json({ success: false, message: "Not enough weekly referrals for any tier." });
      }
    } else {
      return res.json({ success: false, message: "Invalid withdrawal type" });
    }

    // ✅ Make sure bank details exist
    const bank = await Bank.findOne({ userId: user._id });
    if (!bank) {
      return res.json({ success: false, message: "Add bank details first." });
    }

    // ✅ Check if user already has a pending request of this type
    const existingWithdrawal = await Withdrawal.findOne({
      user: user._id,
      type,
      status: "pending"
    });
    if (existingWithdrawal) {
      return res.json({ success: false, message: "You already have a pending request." });
    }

    // ✅ Save withdrawal request
    await Withdrawal.create({
      user: user._id,
      type,
      amount,
      status: "pending",
      bankDetails: {
        bankName: bank.bankName,
        accountName: bank.accountName,
        accountNumber: bank.accountNumber,
      },
    });

    return res.json({
      success: true,
      message: `Withdrawal request of ₦${amount.toLocaleString()} submitted.`,
    });

  } catch (err) {
    console.error("Withdrawal error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
