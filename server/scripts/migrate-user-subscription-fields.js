require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/user.model");

const migrate = async () => {
  await connectDB();
  const result = await User.updateMany(
    {
      $or: [
        { subscriptionStatus: { $exists: false } },
        { hasUsedTrial: { $exists: false } },
      ],
    },
    {
      $set: {
        subscriptionStatus: "none",
        hasUsedTrial: false,
      },
    }
  );

  console.log(`Updated ${result.modifiedCount} user(s)`);
};

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
