// middleware/auth.js

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.redirect("/auth/login"); // redirect if not logged in
  }
}

module.exports = { isAuthenticated };
