// routes/admin.js
const express = require("express");
const Payment = require("../models/Payment");
const User = require("../models/User");
const router = express.Router();

// Middleware for admin auth (replace with your own check later)
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) return next();
  return res.redirect("/login");
}

// Admin dashboard: see all pending payments
router.get("/admin/payments", isAdmin, async (req, res) => {
  const payments = await Payment.find().populate("user").sort({ createdAt: -1 });
  res.render("admin", { payments });
});

// Admin claims dashboard: see all pending claims
router.get("/admin/claims", isAdmin, async (req, res) => {
  try {
    const Claim = require("../models/Claim");
    const claims = await Claim.find()
      .populate("user")
      .populate("payment")
      .sort({ createdAt: -1 });
    res.render("adminClaims", { claims });
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.render("adminClaims", { claims: [] });
  }
});

// Approve payment
router.post("/admin/payments/:id/approve", isAdmin, async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate("user");
  if (!payment) return res.redirect("/admin/payments");

  payment.status = "approved";
  payment.approvedAt = new Date();

  // ✅ Set store durations & daily earnings
  let days = 0;
  let dailyEarning = 0;

  switch (payment.store) {
    case "S1":
      days = 45; dailyEarning = 350; break;
    case "S2":
      days = 45; dailyEarning = 850; break;
    case "S3":
      days = 45; dailyEarning = 2000; break;
    case "S4":
      days = 90; dailyEarning = 3000; break;
    case "S5":
      days = 90; dailyEarning = 4000; break;
    case "S6":
      days = 365; dailyEarning = 6000; break;
    case "S7":
      days = 365; dailyEarning = 15000; break;
    case "S8":
      days = 365; dailyEarning = 35000; break;
    default:
      days = 0; dailyEarning = 0;
  }

  // ✅ set expiry + shop info
  if (days > 0) {
    payment.validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    payment.durationDays = days;
    payment.dailyEarning = dailyEarning;
    payment.lastPayout = new Date();
    payment.totalEarned = 0;
  }

  await payment.save();

  // ✅ Free shop special handling
  if (payment.store === "FREE") {
    payment.durationDays = 3;
    payment.dailyEarning = 300;
    payment.validUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    payment.totalEarned = 0;
    payment.lastPayout = new Date();
    console.log(`Free shop approved: Set up for 3 days with ₦300 daily earnings`);
  }

  await payment.user.save();

  // ✅ Referral logic runs only on approval
  if (payment.user.referredBy) {
    const referrer = await User.findById(payment.user.referredBy);
    if (referrer) {
      // Get referrer's most recent active approved shop
      const referrerShop = await Payment.findOne({
        user: referrer._id,
        status: "approved",
        validUntil: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      referrer.verifiedReferrals = (referrer.verifiedReferrals || 0) + 1;
      referrer.monthlyReferrals = (referrer.monthlyReferrals || 0) + 1;

      let directBonusPaid = false;

      // ✅ Direct Referral Bonus (10%)
      if (referrerShop && parseInt(referrerShop.amount) >= parseInt(payment.amount)) {
        const directBonus = Math.floor(parseInt(payment.amount) * 0.10);
        referrer.referralAmount = (referrer.referralAmount || 0) + directBonus;
        referrer.bonusEligibleReferrals = (referrer.bonusEligibleReferrals || 0) + 1;
        directBonusPaid = true;
        console.log(`Direct bonus: ₦${directBonus} awarded to referrer ${referrer._id}`);
      } else {
        console.log(`No direct bonus: Referrer ₦${referrerShop?.amount || 0}, Referral ₦${payment.amount}`);
      }

      await referrer.save();

      // ✅ Indirect Referral Bonus (5%) — only if direct bonus was paid
      if (directBonusPaid && referrer.referredBy) {
        const grandReferrer = await User.findById(referrer.referredBy);
        if (grandReferrer) {
          const grandReferrerShop = await Payment.findOne({
            user: grandReferrer._id,
            status: "approved",
            validUntil: { $gt: new Date() }
          }).sort({ createdAt: -1 });

          if (grandReferrerShop && parseInt(grandReferrerShop.amount) >= parseInt(payment.amount)) {
            const indirectBonus = Math.floor(parseInt(payment.amount) * 0.05);
            grandReferrer.referralAmount = (grandReferrer.referralAmount || 0) + indirectBonus;
            console.log(`Indirect bonus: ₦${indirectBonus} awarded to grand-referrer ${grandReferrer._id}`);
            await grandReferrer.save();
          } else {
            console.log(`No indirect bonus: Grand-referrer ₦${grandReferrerShop?.amount || 0}, Referral ₦${payment.amount}`);
          }
        }
      }
    }
  }

  res.redirect("/admin/payments");
});

// Reject payment
router.post("/admin/payments/:id/reject", isAdmin, async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.redirect("/admin/payments");

  payment.status = "rejected";
  await payment.save();

  res.redirect("/admin/payments");
});

// Approve claim (for expired shops)
router.post("/admin/claims/:id/approve", isAdmin, async (req, res) => {
  try {
    const Claim = require("../models/Claim");
    const claim = await Claim.findById(req.params.id).populate("user payment");

    if (!claim) return res.redirect("/admin/claims");

    claim.status = "approved";
    claim.approvedAt = new Date();
    await claim.save();

    claim.user.balance -= claim.amount;

    if (claim.payment && claim.payment.store === "FREE") {
      claim.user.welcomeBonusClaimed = true;
      console.log(`Free shop claim approved: DEDUCTED ₦${claim.amount} from user balance and marked welcome bonus as claimed for user ${claim.user._id}`);
    } else {
      console.log(`Regular shop claim approved: DEDUCTED ₦${claim.amount} from user balance for user ${claim.user._id}`);
    }

    await claim.user.save();
    res.redirect("/admin/claims");
  } catch (error) {
    console.error("Claim approval error:", error);
    res.redirect("/admin/claims");
  }
});

// Reject claim
router.post("/admin/claims/:id/reject", isAdmin, async (req, res) => {
  try {
    const Claim = require("../models/Claim");
    const claim = await Claim.findById(req.params.id);

    if (!claim) return res.redirect("/admin/claims");

    claim.status = "rejected";
    claim.rejectedAt = new Date();
    await claim.save();

    res.redirect("/admin/claims");
  } catch (error) {
    console.error("Claim rejection error:", error);
    res.redirect("/admin/claims");
  }
});

module.exports = router;
