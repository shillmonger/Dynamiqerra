const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Claim = require("../models/Claim");
const User = require("../models/User");
const Bank = require("../models/Bank"); // still imported, but not used now
const Payment = require("../models/Payment");

// Inline admin check
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) return next();
  return res.redirect("/login");
}

// Show all pending claims
router.get("/", isAdmin, async (req, res) => {
  try {
    const claims = await Claim.find({ status: "pending" })
      .populate("user")
      .populate("payment");

    // ✅ No need to fetch Bank separately anymore,
    // because bankDetails is stored inside the claim
    res.render("adminClaims", { claims: claims || [] });
  } catch (err) {
    console.error("Error in GET /admin/claims:", err);
    res.status(500).send("Server error");
  }
});


// Approve claim
router.post("/:id/approve", isAdmin, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate("user")
      .populate("payment");

    if (!claim) return res.status(404).send("Claim not found");

    const payment = claim.payment;

    if (!payment) {
      return res.status(400).send("No payment linked to claim");
    }

    // ✅ Deduct only from dailyEarning
    payment.dailyEarning = Math.max((payment.dailyEarning || 0) - claim.amount, 0);
    await payment.save();

    // ✅ Mark claim as approved
    claim.status = "approved";
    await claim.save();

    res.redirect("/admin/claims");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Decline claim
router.post("/:id/decline", isAdmin, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).send("Claim not found");

    claim.status = "declined";
    await claim.save();

    res.redirect("/admin/claims");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
