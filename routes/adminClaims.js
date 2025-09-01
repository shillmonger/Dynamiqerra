const express = require("express");
const router = express.Router();
const Claim = require("../models/Claim");
const User = require("../models/User");
const Bank = require("../models/Bank");
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

    // Also load bank info for each user
    const claimsWithBank = await Promise.all(
      claims.map(async (claim) => {
        const bank = await Bank.findOne({ userId: claim.user._id });
        return { ...claim.toObject(), bank };
      })
    );

    res.render("admin-claims", { claims: claimsWithBank });
  } catch (err) {
    console.error(err);
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

    const user = claim.user;
    const payment = claim.payment;

    if (!payment) {
      return res.status(400).send("No payment linked to claim");
    }

    // ✅ Calculate what to deduct: principal + earnings
    const principal = payment.amount || 0;
    const earned = payment.totalEarned || 0;
    const toDeduct = principal + earned;

    // ✅ Deduct from user balance
    user.balance = (user.balance || 0) - toDeduct;
    if (user.balance < 0) user.balance = 0;
    await user.save();

    // ✅ Mark the related payment as claimed
    payment.claimed = true;
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
