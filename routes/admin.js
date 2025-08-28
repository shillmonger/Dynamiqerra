// routes/admin.js
const express = require("express");
const Payment = require("../models/Payment");
const User = require("../models/User");
const router = express.Router();

// Middleware for admin auth (replace with your own check later)
// routes/admin.js
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) return next();
  return res.redirect("/login");
}


// Admin dashboard: see all pending payments
router.get("/admin/payments", isAdmin, async (req, res) => {
  const payments = await Payment.find().populate("user").sort({ createdAt: -1 });
  res.render("admin", { payments });
});

// Approve payment
// Approve payment
router.post("/admin/payments/:id/approve", isAdmin, async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate("user");
  if (!payment) return res.redirect("/admin/payments");

  payment.status = "approved";
  payment.approvedAt = new Date();

  // ✅ set validUntil based on store
  let days = 0;
  //  payment.validUntil = new Date(Date.now() + 2 * 60 * 1000);
  if (payment.store === "S1") days = 45;
  if (payment.store === "S2") days = 45;
  if (payment.store === "S3") days = 45;
  if (payment.store === "S4") days = 90;
  if (payment.store === "S5") days = 90;
  if (payment.store === "S6") days = 365;
  if (payment.store === "S7") days = 365;
  if (payment.store === "S8") days = 365;
  // ... add more as needed

  if (days > 0) {
    payment.validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  await payment.save();

  // credit user
  payment.user.balance += payment.amount;
  await payment.user.save();

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

module.exports = router;
