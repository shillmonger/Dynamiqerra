const express = require("express");
const User = require("../models/User");
const Payment = require("../models/Payment");
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

  // 🚀 only include shops that are approved, not claimed, and not expired yesterday
  const payments = await Payment.find({
    user: userId,
    status: "approved",
    claimed: { $ne: true },
    validUntil: { $gt: yesterday }
  });

  let todayIncome = 0,
    yesterdayIncome = 0,
    totalIncome = 0;
  let todayOrders = 0,
    yesterdayOrders = 0,
    totalOrders = 0;

  for (const p of payments) {
    const shopStart = new Date(p.createdAt);
    const shopEnd = p.validUntil ? new Date(p.validUntil) : today;

    const shopStartStr = dateOnlyString(shopStart);
    const shopEndStr = dateOnlyString(shopEnd);

    // ✅ count how many days this shop has run
    let daysRunning = 0;
    if (shopStartStr <= todayStr) {
      const lastDayStr = shopEndStr < todayStr ? shopEndStr : todayStr;
      const diffDays =
        (new Date(lastDayStr) - new Date(shopStartStr)) / (1000 * 60 * 60 * 24);
      daysRunning = Math.floor(diffDays) + 1;
    }

    // ✅ income so far
    const earnedSoFar = (p.dailyEarning || 0) * daysRunning;
    totalIncome += earnedSoFar;
    totalOrders += daysRunning;

    if (shopStartStr <= todayStr && shopEndStr >= todayStr) {
      todayIncome += p.dailyEarning || 0;
      todayOrders++;
    }
    if (shopStartStr <= yesterdayStr && shopEndStr >= yesterdayStr) {
      yesterdayIncome += p.dailyEarning || 0;
      yesterdayOrders++;
    }

    // ⚡ Save progress into DB (so claim button sees exact number)
    if (p.totalEarned !== earnedSoFar) {
      p.totalEarned = earnedSoFar;
      await p.save();
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

    res.render("dashboard", { user, stats });
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
      (user.balance || 0) + referralAmount + (stats.totalIncome || 0);

    // 🔹 expired shops to show "claim" button
    const expiredPayments = await Payment.find({
      user: user._id,
      validUntil: { $lte: new Date() },
      claimed: { $ne: true },
    }).sort({ validUntil: -1 });

    res.render("profile", {
      user,
      stats,
      totalReferralsCount,
      verifiedReferralsCount,
      referralAmount,
      accountBalance,
      expiredPayments, // ⚡ each now has up-to-date totalEarned from DB
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


// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
