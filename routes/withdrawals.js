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


    const { type } = req.body; // 'referral', 'weekly', 'monthly'
    let amount = 0;
    const today = new Date();

    // Restrict withdrawals on Sundays
    if (today.getDay() === 0) {
      return res.json({ success: false, message: "Withdrawals are not allowed on Sundays." });
    }

    // Referral Bonus withdrawal
    if (type === "referral") {
      const referralAmount = user.referralAmount || 0;
      if (referralAmount < 1000) {
        return res.json({ success: false, message: "Minimum withdrawal is ₦1,000." });
      }
      amount = referralAmount;
      // Only allow Mon-Sat
      // Already checked for Sunday above
    }
    // Weekly Salary withdrawal
else if (type === "weekly") {
  // Only allow on Saturday
  if (today.getDay() !== 6) {
    return res.json({ success: false, message: "Allowed only on Saturdays." });
  }

  const weeklyReferralsCount = user.weeklyReferralsCount || 0;

  if (weeklyReferralsCount === 10) {
    amount = 5000;
  } else if (weeklyReferralsCount >= 11 && weeklyReferralsCount <= 20) {
    amount = 10000;
  } else if (weeklyReferralsCount >= 21 && weeklyReferralsCount <= 50) {
    amount = 20000;
  } else if (weeklyReferralsCount >= 51 && weeklyReferralsCount <= 100) {
    amount = 100000;
  } else if (weeklyReferralsCount >= 101 && weeklyReferralsCount <= 300) {
    amount = 200000;
  } else if (weeklyReferralsCount >= 301) {
    amount = 250000;
  }

  // If no valid tier found
  if (amount <= 0) {
    return res.json({ success: false, message: "Not enough weekly referrals for any tier." });
  }
}

  // Monthly Salary withdrawal
else if (type === "monthly") {
  // Only allow on last Saturday of the month
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const lastSaturday = new Date(lastDay);
  lastSaturday.setDate(lastDay.getDate() - ((lastDay.getDay() + 1) % 7));

  if (!(today.getDay() === 6 && today.getDate() === lastSaturday.getDate())) {
    return res.json({ success: false, message: "Allowed only on the last Saturday of the month." });
  }

  const monthlyReferrals = user.monthlyReferrals || 0;

  if (monthlyReferrals >= 20 && monthlyReferrals <= 50) {
    amount = 10000;
  } else if (monthlyReferrals >= 51 && monthlyReferrals <= 100) {
    amount = 25000;
  } else if (monthlyReferrals >= 101 && monthlyReferrals <= 200) {
    amount = 50000;
  } else if (monthlyReferrals >= 201 && monthlyReferrals <= 500) {
    amount = 150000;
  } else if (monthlyReferrals >= 501) {
    amount = 300000;
  }

  // If no valid tier found
  if (amount <= 0) {
    return res.json({ success: false, message: "Not enough monthly referrals for any tier." });
  }
}

    else {
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
