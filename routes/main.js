const express = require("express");
const User = require("../models/User");
const Payment = require("../models/Payment");
const router = express.Router();

// Middleware to check session
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect("/login");
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

// Dashboard
router.get("/dashboard", isAuthenticated, (req, res) => {
  res.render("dashboard", { user: req.session.user });
});

// Profile
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id); 
    res.render("profile", { user });
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
});

// Shop levels
router.get("/Shop", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.user._id);

  // fetch all payments for history display
  const payments = await Payment.find({ user: user._id }).sort({ createdAt: -1 });

  // ✅ check only for active payments (approved + not expired)
  const activePayment = await Payment.findOne({
    user: user._id,
    status: "approved",
    validUntil: { $gt: new Date() }
  });

  res.render("Shop", { 
    user, 
    payments, 
    activePayment // will be null if no active payment
  });
});



// // Team
// router.get("/team", isAuthenticated, async (req, res) => {
//   // get fresh user from DB
//   const user = await User.findById(req.session.user._id);

//   const activePayment = await Payment.findOne({
//     user: user._id,
//     status: "approved",
//     validUntil: { $gt: new Date() }
//   });

//   res.render("team", {
//     user,          // ✅ now includes referral
//     activePayment
//   });
// });


// Capture referral links
router.get("/:referralCode", (req, res, next) => {
  const referralCode = req.params.referralCode;

  // if it's not a referral code (like /shop or /team), skip
  if (["shop", "team", "payment", "login", "register"].includes(referralCode)) {
    return next();
  }

  // Redirect to register page with ?ref=CODE
  res.redirect(`/register?ref=${referralCode}`);
});




// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});


module.exports = router;
