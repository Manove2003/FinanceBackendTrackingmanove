require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const sequelize = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const targetRoutes = require("./routes/targetRoutes");
const monthlyDataRoutes = require("./routes/monthlyDataRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const corsOptions = {
  origin: [
    "https://finance-trackerx0.vercel.app/dashboard",
    "http://localhost:5173",
    "https://strong-griffin-d655ec.netlify.app/",
  ],
  methods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-skip-redirect"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(cookieParser());

app.use("/api", authRoutes);
app.use("/api/monthly-data", monthlyDataRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/targets", targetRoutes);
app.use("/api/transactions", transactionRoutes);

sequelize
  .sync({ force: false })
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.log("Error: " + err));
