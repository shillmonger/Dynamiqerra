// app.js
const express = require("express");
const path = require("path");
const session = require("express-session");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = 3000;

// ================== DB CONFIG ==================
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// ================== Middleware ==================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Flash message middleware
app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// const deviceCheck = require("./middleware/deviceCheck");
// app.use(deviceCheck);

// ================== Routes ==================
app.use("/", require("./routes/auth"));
app.use("/", require("./routes/main"));
app.use("/", require("./routes/payment"));
app.use("/", require("./routes/admin"));
app.use("/", require("./routes/team"));
app.use("/", require("./routes/bank")); 
app.use("/", require("./routes/withdrawals"));
app.use("/", require("./routes/adminWithdrawals"));
app.use("/claim", require("./routes/claim"));
app.use("/admin/claims", require("./routes/adminClaims"));





// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
