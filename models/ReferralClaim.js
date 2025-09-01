const mongoose = require("mongoose");

const referralClaimSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  type: { 
    type: String, 
    enum: ["weekly", "monthly"], 
    required: true 
  },

  amount: { 
    type: Number, 
    required: true 
  },

  // snapshot of user’s bank details at time of claim
  bankName: { type: String, required: true },
  accountName: { type: String, required: true },
  accountNumber: { type: String, required: true },

  status: { 
    type: String, 
    enum: ["pending", "paid", "declined"], 
    default: "pending" 
  },

  // for audit trail
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // optional: track which admin approved/declined
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

referralClaimSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("ReferralClaim", referralClaimSchema);
