// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

// Register route
router.post("/auth/register", async (req, res) => {
  const { phone, txnPassword, password, confirmPassword } = req.body;
  let referral = req.body.referral || req.query.ref; // ✅ prefer link, fallback to form

  try {
    // Check if passwords match
    if (password !== confirmPassword) {
      return res.render("register", {
        message: "Passwords do not match",
        messageType: "error"
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.render("register", {
        message: "Phone number already registered",
        messageType: "error"
      });
    }

    // Hash login password only
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default referredBy null
    let referredBy = null;

    // If referral code is provided, find upline
    if (referral) {
      const upline = await User.findOne({ referral });
      if (upline) {
        referredBy = upline._id;
      }
    }

    // Save new user
    const newUser = new User({
      phone,
      txnPassword, // ⚠️ consider hashing later
      password: hashedPassword,
      referral: Math.floor(10000 + Math.random() * 90000).toString(), // generate their own code
      referredBy
    });
    await newUser.save();

    // ✅ Increment total referrals immediately at signup
    if (newUser.referredBy) {
      const referrer = await User.findById(newUser.referredBy);
      if (referrer) {
        referrer.totalReferrals = (referrer.totalReferrals || 0) + 1;
        await referrer.save();
      }
    }

    // ✅ Save minimal but important fields in session
    req.session.user = {
      _id: newUser._id,
      phone: newUser.phone,
      balance: newUser.balance,
      isAdmin: newUser.isAdmin
    };

    return res.redirect("/dashboard");

  } catch (error) {
    console.error(error);
    res.render("register", {
      message: "Something went wrong. Try again later.",
      messageType: "error"
    });
  }
});



// Login route
router.post("/auth/login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.render("login", {
        message: "User not found",
        messageType: "error"
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", {
        message: "Invalid credentials",
        messageType: "error"
      });
    }

    // ✅ Always refresh session with up-to-date DB values
    req.session.user = {
      _id: user._id,
      phone: user.phone,
      balance: user.balance,
      isAdmin: user.isAdmin
    };

    return res.redirect("/dashboard");

  } catch (error) {
    console.error(error);
    res.render("login", {
      message: "Something went wrong. Try again later.",
      messageType: "error"
    });
  }
});

module.exports = router;
