// models/Payment.js
const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  store: { type: String, required: true }, 
  method: { type: String, required: true },
  currency: { type: String, default: "NGN" },
  amount: { type: Number, required: true },
  txid: { type: String, required: true },
  screenshot: { type: String, default: null },

  status: { 
    type: String, 
    enum: ["pending", "approved", "rejected"], 
    default: "pending" 
  },

  validUntil: { type: Date }, // shop expiry date

  // 🔹 shop earning tracking
  dailyEarning: { type: Number, default: 0 }, 
  durationDays: { type: Number, default: 0 },  
  totalEarned: { type: Number, default: 0 }, // cumulative shop earnings

  lastPayout: { type: Date, default: null },  

  // 🔹 claim tracking
  claimed: { type: Boolean, default: false }, // ✅ mark true once admin approves claim
  lastClaimDate: { type: Date, default: null }, // ✅ track when shop was last claimed for daily income

}, { timestamps: true }); // this will also auto-add createdAt & updatedAt

module.exports = mongoose.model("Payment", PaymentSchema);
