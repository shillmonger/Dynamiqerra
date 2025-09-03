const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  txnPassword: { type: String, required: true },
  password: { type: String, required: true },
  referral: { type: String },   // personal referral code
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // balances
  balance: { type: Number, default: 0 },
  referralAmount: { type: Number, default: 0 },  // total from referrals (₦1k per verified referral)
  weeklyBonus: { type: Number, default: 0 },     // tier bonus (5k, 10k, 20k, 100k, 250k)
  bonusEligibleReferrals: { type: Number, default: 0 },
  welcomeBonusClaimed: { type: Boolean, default: false }, // ✅ track if welcome bonus was claimed

  // referral counts
  totalReferrals: { type: Number, default: 0 },
  verifiedReferrals: { type: Number, default: 0 },
  monthlyReferrals: { type: Number, default: 0 },

  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
