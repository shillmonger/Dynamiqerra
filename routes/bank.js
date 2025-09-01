// routes/bank.js
const express = require("express");
const router = express.Router();
const Bank = require("../models/Bank");

// Save bank details
router.post("/bank", async (req, res) => {
  try {
    const userId =
      (req.session && req.session.user && req.session.user._id) ||
      req.body.userId;

    if (!userId) {
      req.session.message = {
        type: "error",
        text: "You must be logged in",
      };
      return res.redirect("/profile"); // 👈 explicit redirect
    }

    const { bankName, accountName, accountNumber } = req.body;

    if (!bankName || !accountName || !accountNumber) {
      req.session.message = {
        type: "error",
        text: "All fields are required",
      };
      return res.redirect("/profile"); // 👈 explicit redirect
    }

    await Bank.findOneAndUpdate(
      { userId },
      { bankName, accountName, accountNumber },
      { new: true, upsert: true }
    );

    req.session.message = {
      type: "success",
      text: "saved successfully",
    };
    res.redirect("/profile"); // 👈 explicit redirect
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "error",
      text: "Something went wrong",
    };
    res.redirect("/profile"); // 👈 explicit redirect
  }
});

module.exports = router;
