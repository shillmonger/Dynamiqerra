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

// Import routes
const authRoutes = require("./routes/auth");
const mainRoutes = require("./routes/main");
const paymentRoutes = require("./routes/payment");
const adminRoutes = require("./routes/admin");
const teamRoutes = require("./routes/team");

// ================== Middleware ==================

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Set view engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files (CSS, JS, images) BEFORE device check
app.use(express.static(path.join(__dirname, "public")));

// Parse form data / JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Device check (restrict big screens) AFTER static files are served
const deviceCheck = require("./middleware/deviceCheck");
app.use(deviceCheck);

// ================== Routes ==================
app.use("/", authRoutes);
app.use("/", mainRoutes);
app.use("/", paymentRoutes);
app.use("/", adminRoutes);
app.use("/", teamRoutes);

// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
