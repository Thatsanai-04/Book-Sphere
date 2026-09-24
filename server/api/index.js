require("dotenv").config();

const app = require("../src/app");
const connectDB = require("../src/config/db");

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Serverless API initialization failed:", error.message);
    return res.status(500).json({ message: "Server initialization failed" });
  }
};
