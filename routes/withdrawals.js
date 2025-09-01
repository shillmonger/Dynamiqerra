// routes/withdrawals.js
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require("../models/User");
const Withdrawal = require("../models/Withdrawal");
const Bank = require("../models/Bank"); 

router.post("/team/withdraw", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) return res.status(401).json({ success: false, message: "Not logged in" });

    const { type } = req.body; // 'weekly' or 'monthly'
    let amount = 0;

    const today = new Date();

    // ⬇ Check if today is Sunday
    const isSunday = today.getDay() === 0;

    // ⬇ Check if today is last Sunday of the month
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const lastSunday = new Date(lastDayOfMonth);
    lastSunday.setDate(lastDayOfMonth.getDate() - lastDayOfMonth.getDay());
    const isLastSunday = today.toDateString() === lastSunday.toDateString();

    // ✅ Weekly bonus check
    if (type === "weekly") {
      if (!isSunday) {
        return res.json({ success: false, message: "Only allowed on Sundays." });
      }

      const referralAmount = user.referralAmount || 0;

      if (referralAmount >= 5000 && referralAmount <= 9999) amount = 5000;
      else if (referralAmount >= 10000 && referralAmount <= 19999) amount = 10000;
      else if (referralAmount >= 20000 && referralAmount <= 49999) amount = 20000;
      else if (referralAmount >= 50000 && referralAmount <= 99999) amount = 100000;
      else if (referralAmount >= 100000) amount = 250000;
    } 
    // ✅ Monthly bonus check
    else if (type === "monthly") {
      if (!isLastSunday) {
        return res.json({ success: false, message: "Allowed on the last Sunday of the month." });
      }

      const monthlyReferrals = user.monthlyReferrals || 0;

      if (monthlyReferrals >= 20 && monthlyReferrals <= 49) amount = 10000;
      else if (monthlyReferrals >= 50 && monthlyReferrals <= 99) amount = 25000;
      else if (monthlyReferrals >= 100 && monthlyReferrals <= 199) amount = 50000;
      else if (monthlyReferrals >= 200 && monthlyReferrals <= 499) amount = 150000;
      else if (monthlyReferrals >= 500) amount = 300000;
    } 
    else {
      return res.json({ success: false, message: "Invalid withdrawal type" });
    }

    // If no valid tier found
    if (amount <= 0) {
      return res.json({ success: false, message: "Not enough verified referrals." });
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
      return res.json({
        success: false,
        message: "You already have a pending request."
      });
    }

    // ✅ Save withdrawal request
    await Withdrawal.create({
      user: user._id,
      type,
      amount,
      status: "pending", // new field
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
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
