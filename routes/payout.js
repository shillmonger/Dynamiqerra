// routes/payout.js
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Payment = require("../models/Payment");
const Bank = require("../models/Bank");
const Claim = require("../models/Claim");

// Middleware to check session
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/login");
}
// Handle daily task withdrawal request
router.post("/payout/task-withdrawal", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    const bank = await Bank.findOne({ userId: user._id });
    if (!bank) {
      return res.status(400).json({ error: "Please add your bank details before withdrawing." });
    }

    const { amount, shop } = req.body;
    const parsedAmount = parseInt(amount, 10);

    if (!shop) {
      return res.status(400).json({ error: "Please select a valid shop." });
    }

    if (isNaN(parsedAmount) || parsedAmount < 1000) {
      return res.status(400).json({ error: "Minimum withdrawal is ₦1000." });
    }

    // Find the selected shop/payment
    const payment = await Payment.findOne({
      user: user._id,
      store: shop,
      status: "approved",
      validUntil: { $gt: new Date() }
    });

    if (!payment) {
      return res.status(400).json({ error: "Selected shop not found or expired." });
    }

    // Check if enough claimable
    const claimable = payment.totalEarned || 0;
    if (parsedAmount > claimable) {
      return res.status(400).json({ error: `Amount exceeds claimable earnings. You can only withdraw ₦${claimable}.` });
    }

    // Deduct immediately from totalEarned
    payment.totalEarned = claimable - parsedAmount;
    await payment.save();

    // Create claim linked to this shop, including snapshot of bank details
    const claim = new Claim({
      user: user._id,
      payment: payment._id, // linked to the shop
      amount: parsedAmount,
      status: "pending",
      bankDetails: {
        bankName: bank.bankName,
        accountName: bank.accountName,
        accountNumber: bank.accountNumber
      }
    });
    await claim.save();

    return res.json({ success: true, message: "Withdrawal request submitted." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "An error occurred. Please try again." });
  }
});






router.get("/payout", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    // Get expired payments (shops)
    const expiredPayments = await Payment.find({
      user: user._id,
      status: "approved",
      validUntil: { $lte: new Date() },
      claimed: { $ne: true },
    }).sort({ validUntil: -1 });

    // Process expired payments to include welcome bonus for free shops
    const processedExpiredPayments = expiredPayments.map(payment => {
      if (payment.store === "FREE") {
        if (!user.welcomeBonusClaimed) {
          return {
            ...payment.toObject(),
            totalClaimAmount: (payment.totalEarned || 0) + 500,
            includesWelcomeBonus: true
          };
        } else {
          return {
            ...payment.toObject(),
            totalClaimAmount: (payment.totalEarned || 0),
            includesWelcomeBonus: false
          };
        }
      } else {
        // For regular shops, only claim earned income (not purchase amount)
        return {
          ...payment.toObject(),
          totalClaimAmount: (payment.totalEarned || 0),
          includesWelcomeBonus: false
        };
      }
    });

    // fetch bank details
    const bank = await Bank.findOne({ userId: user._id });

    // Build shopEarnings object for all active/approved shops
    const activePayments = await Payment.find({
      user: user._id,
      status: "approved",
      validUntil: { $gt: new Date() }
    });
    const shopEarnings = {};
    activePayments.forEach(p => {
      shopEarnings[p.store] = p.totalEarned || 0;
    });

    res.render("payout", {
      user,
      expiredPayments: processedExpiredPayments,
      bank,
      shopEarnings,
      accountBalance: user.balance || 0
    });
  } catch (err) {
    console.error(err);
    res.render("payout", { user: null, expiredPayments: [], bank: null });
  }
});

module.exports = router;
