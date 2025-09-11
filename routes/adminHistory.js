const express = require('express');
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Payment = require('../models/Payment');
const Claim = require('../models/Claim');


// Inline admin check
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) return next();
  return res.redirect("/login");
}

// GET /admin/history
router.get('/admin/history', isAuthenticated, isAdmin, async (req, res) => {
	try {
		const withdrawals = await Withdrawal.find({})
			.populate('user', 'phone') // show phone from User
			.sort({ createdAt: -1 });

		const payments = await Payment.find({})
			.populate('user', 'phone') // show phone from User
			.sort({ createdAt: -1 });

		const claims = await Claim.find({})
			.populate('user', 'phone') // show phone from User
			.populate('payment')
			.sort({ createdAt: -1 });

		res.render('adminHistory', {
			withdrawals,
			payments,
			claims
		});
	} catch (err) {
		console.error("Error fetching admin history:", err);
		res.status(500).send('Error fetching admin history');
	}
});

module.exports = router;
