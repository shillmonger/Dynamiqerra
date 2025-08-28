// models/Payment.js
const mongoose = require("mongoose");

// models/Payment.js
const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  store: { type: String, required: true }, // e.g. "S1", "S2"
  method: { type: String, required: true },
  currency: { type: String, default: "NGN" },
  amount: { type: Number, required: true },
  txid: { type: String, required: true },
  screenshot: { type: String, default: null },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  validUntil: { type: Date }, // when the plan expires
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model("Payment", PaymentSchema);
