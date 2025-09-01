const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "approved", "declined"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Claim", claimSchema);
