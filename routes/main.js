const express = require("express");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Bank = require("../models/Bank");
const Claim = require("../models/Claim");
const router = express.Router();

// Middleware to check session
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/login");
}

// helper: get YYYY-MM-DD string
function dateOnlyString(d) {
  return new Date(d).toISOString().slice(0, 10);
}

// helper: calculate stats for a user
async function calculateStats(userId) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayStr = dateOnlyString(today);
  const yesterdayStr = dateOnlyString(yesterday);

  // 🚀 Get all approved shops (active and expired) for stats calculation
  const payments = await Payment.find({
    user: userId,
    status: "approved"
  });

  let todayIncome = 0,
    yesterdayIncome = 0,
    totalIncome = 0;
  let todayOrders = 0,
    yesterdayOrders = 0,
    totalOrders = 0;

  for (const p of payments) {
    // Only count income from shops that have been claimed (manual claims)
    // totalIncome is now based on actual claimed amounts, not automatic calculation
    totalIncome += p.totalEarned || 0;
    
    // Count total daily claims made (totalEarned / dailyEarning = number of claims)
    if (p.dailyEarning > 0 && p.totalEarned > 0) {
      totalOrders += Math.floor(p.totalEarned / p.dailyEarning);
    }
    
    // Count active shops for today/yesterday stats (only if claimed today)
    const shopStart = new Date(p.createdAt);
    const shopEnd = p.validUntil ? new Date(p.validUntil) : today;

    const shopStartStr = dateOnlyString(shopStart);
    const shopEndStr = dateOnlyString(shopEnd);

    // Only count income if shop is active AND was claimed today
    if (shopStartStr <= todayStr && shopEndStr >= todayStr) {
      if (p.lastClaimDate) {
        const lastClaimStr = dateOnlyString(p.lastClaimDate);
        if (lastClaimStr === todayStr) {
          todayIncome += p.dailyEarning || 0;
          todayOrders++;
        }
      }
    }
    if (shopStartStr <= yesterdayStr && shopEndStr >= yesterdayStr) {
      if (p.lastClaimDate) {
        const lastClaimStr = dateOnlyString(p.lastClaimDate);
        if (lastClaimStr === yesterdayStr) {
          yesterdayIncome += p.dailyEarning || 0;
          yesterdayOrders++;
        }
      }
    }
  }

  return {
    todayIncome,
    yesterdayIncome,
    totalIncome,
    todayOrders,
    yesterdayOrders,
    totalOrders,
    canComplete: payments.length,
  };
}



// Landing Page
router.get("/", (req, res) => {
  res.render("index");
});

// Login Page
router.get("/login", (req, res) => {
  res.render("login");
});

// Register Page
router.get("/register", (req, res) => {
  res.render("register", { ref: req.query.ref || "" });
});


// funding-detals Page
router.get("/funding-details", (req, res) => {
  res.render("funding-details");
});


// withdrawal-details Page
router.get("/withdrawal-details", (req, res) => {
  res.render("withdrawal-details");
});

// Dashboard
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    const stats = await calculateStats(user._id);
    
    // Get active shops for claim buttons
    const activeShops = await Payment.find({
      user: user._id,
      status: "approved",
      validUntil: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    res.render("dashboard", { user, stats, activeShops });
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
});



// Profile
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    const stats = await calculateStats(user._id);

    const totalReferralsCount = user.totalReferrals || 0;
    const verifiedReferralsCount = user.verifiedReferrals || 0;
    const referralAmount = user.referralAmount || 0;

    const accountBalance =
      (user.balance || 0); // Remove referralAmount from balance calculation

    // 🔹 expired shops to show "claim" button (for final claim when shop expires)
    const expiredPayments = await Payment.find({
      user: user._id,
      status: "approved",
      validUntil: { $lte: new Date() },
      claimed: { $ne: true },
    }).sort({ validUntil: -1 });

    // 🔹 Process expired payments to include welcome bonus for free shops
    const processedExpiredPayments = expiredPayments.map(payment => {
      if (payment.store === "FREE") {
        if (!user.welcomeBonusClaimed) {
          // For free shop with unclaimed welcome bonus, add welcome bonus to total claim amount
          return {
            ...payment.toObject(),
            totalClaimAmount: (payment.totalEarned || 0) + 500, // ₦900 + ₦500 = ₦1,400
            includesWelcomeBonus: true
          };
        } else {
          // For free shop with already claimed welcome bonus, only claim earnings
          return {
            ...payment.toObject(),
            totalClaimAmount: (payment.totalEarned || 0), // ₦900 only
            includesWelcomeBonus: false
          };
        }
      } else {
        // For regular shops, normal claim amount
        return {
          ...payment.toObject(),
          totalClaimAmount: (payment.amount || 0) + (payment.totalEarned || 0),
          includesWelcomeBonus: false
        };
      }
    });

    // 🔹 fetch bank details
    const bank = await Bank.findOne({ userId: user._id });

    // 🔹 Get total approved claims (admin approved final claims)
    const totalApprovedClaims = await Claim.aggregate([
      { $match: { user: user._id, status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalClaimsAmount = totalApprovedClaims.length > 0 ? totalApprovedClaims[0].total : 0;

    res.render("profile", {
      user,
      stats,
      totalReferralsCount,
      verifiedReferralsCount,
      referralAmount,
      accountBalance,
      expiredPayments: processedExpiredPayments, // ✅ use processed payments
      bank, // ✅ pass bank details to EJS
      totalClaimsAmount, // ✅ total approved claims amount
    });
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
});







// Shop levels
router.get("/shop", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.user._id);

  // fetch all payments for history display
  const payments = await Payment.find({ user: user._id }).sort({ createdAt: -1 });

  // ✅ check only for active payments (approved + not expired)
  const activePayment = await Payment.findOne({
    user: user._id,
    status: "approved",
    validUntil: { $gt: new Date() },
  });

  res.render("shop", {
    user,
    payments,
    activePayment, // will be null if no active payment
  });
});


// Capture referral links
// all your real routes first, e.g. profile, dashboard, etc.

// then LAST:
router.get("/:referralCode", (req, res, next) => {
  const referralCode = req.params.referralCode;

  const skipRoutes = [
    "shop","team","payment","login","register",
    "logout","funding-details","dashboard","profile","bank", "withdrawal-details"
  ];
  if (skipRoutes.includes(referralCode)) {
    return next();
  }

  res.redirect(`/register?ref=${referralCode}`);
});


// Activate free shop route
router.post("/activate-free-shop", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    // Check if user already has an active free shop
    const existingFreeShop = await Payment.findOne({
      user: userId,
      store: "FREE",
      status: "approved",
      validUntil: { $gt: new Date() }
    });
    
    if (existingFreeShop) {
      return res.json({ 
        success: false, 
        message: "You already have an active free shop" 
      });
    }
    
    // Create free shop payment
    const freeShop = new Payment({
      user: userId,
      store: "FREE",
      method: "free",
      currency: "NGN",
      amount: 0,
      txid: "FREE_" + Date.now(),
      status: "approved",
      validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      //  validUntil: new Date(Date.now() + 1 * 60 * 1000), // 1 minute (for testing)
      dailyEarning: 300,
      durationDays: 3,
      totalEarned: 0,
      lastPayout: new Date()
    });
    
    await freeShop.save();
    
    res.json({ 
      success: true, 
      message: "Free shop activated successfully!" 
    });
    
  } catch (error) {
    console.error("Free shop activation error:", error);
    res.json({ 
      success: false, 
      message: "Something went wrong" 
    });
  }
});

// Shop claim route
router.post("/claim-shop/:paymentId", isAuthenticated, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.session.user._id;
    
    // Find the payment/shop
    const payment = await Payment.findOne({
      _id: paymentId,
      user: userId,
      status: "approved",
      validUntil: { $gt: new Date() } // Only active shops
    });
    
    if (!payment) {
      return res.json({ 
        success: false, 
        message: "Shop not found or expired" 
      });
    }
    
    // Check if already claimed today
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    
    if (payment.lastClaimDate) {
      const lastClaimStr = payment.lastClaimDate.toISOString().slice(0, 10);
      if (lastClaimStr === todayStr) {
        return res.json({ 
          success: false, 
          message: "Come back tomorrow" 
        });
      }
    }
    
    // Update user balance
    const user = await User.findById(userId);
    user.balance += payment.dailyEarning;
    await user.save();
    
    // Update payment last claim date
    payment.lastClaimDate = today;
    payment.totalEarned += payment.dailyEarning;
    await payment.save();
    
    res.json({ 
      success: true, 
      message: `Successfully claimed ₦${payment.dailyEarning}`,
      newBalance: user.balance
    });
    
  } catch (error) {
    console.error("Claim error:", error);
    res.json({ 
      success: false, 
      message: "Something went wrong" 
    });
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
