const express = require("express");
const router = express.Router();
const Claim = require("../models/Claim");
const Payment = require("../models/Payment");

// User submits claim
router.post("/:paymentId", async (req, res) => {
  try {
    const userId = req.session.user._id; // ✅ use session, not req.user (unless using passport)
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).send("Shop not found");

    // ✅ ensure this payment belongs to the logged-in user
    if (String(payment.user) !== String(userId)) {
      return res.status(403).send("Not authorized to claim this shop");
    }

    // ✅ check if shop expired
    if (payment.validUntil > new Date()) {
      return res.status(400).send("Shop has not expired yet");
    }

    // ✅ check if already claimed
    if (payment.claimed) {
      return res.status(400).send("You already claimed this shop");
    }
 

// ✅ use the amount sent from form
const claimAmount = parseInt(req.body.claimAmount, 10) || 0;


    // (if not stored, you can compute via dailyEarning * days)

    // ✅ save claim record
    const claim = new Claim({
      user: userId,
      payment: paymentId,
      amount: claimAmount,
    });
    await claim.save();

    // ✅ mark payment as claimed so button won't show again
    payment.claimed = true;
    await payment.save();

    res.redirect("/profile"); // or res.json({ success: true, claimAmount });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
