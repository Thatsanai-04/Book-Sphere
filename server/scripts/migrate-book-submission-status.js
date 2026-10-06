require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Book = require("../src/models/book.model");

const migrate = async () => {
  await connectDB();
  const pending = await Book.updateMany({ status: "pending_review" }, { $set: { status: "pending_approval" } });
  const unpublished = await Book.updateMany({ status: "unpublished" }, { $set: { status: "draft" } });
  console.log(`Mapped ${pending.modifiedCount} pending_review book(s) to pending_approval`);
  console.log(`Mapped ${unpublished.modifiedCount} unpublished book(s) to draft`);
};

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });