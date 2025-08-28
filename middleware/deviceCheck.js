// middleware/deviceCheck.js
module.exports = function deviceCheck(req, res, next) {
  const allowedRoutes = ["/", "/login", "/register", "/admin/payments", "/auth/login", "/auth/register"];

  // Always allow landing, login, register
  if (allowedRoutes.includes(req.path)) {
    return next();
  }

  // ✅ Allow referral links (anything not in reserved keywords, but looks like /SOMECODE)
  const reserved = ["shop", "team", "payment", "login", "register"];
  const firstSegment = req.path.split("/")[1]; // e.g. "ABC123" from "/ABC123"

  if (firstSegment && !reserved.includes(firstSegment)) {
    // treat it as a referral code, let the referral route handle it
    return next();
  }

  // Detect user agent
  const ua = req.headers["user-agent"] || "";
  const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  if (!isMobileOrTablet) {
    // Render a special page
    return res.render("largeScreen", {
      message: "This site is only available on mobile or tablet. Please switch to a smaller device."
    });
  }

  next();
};
