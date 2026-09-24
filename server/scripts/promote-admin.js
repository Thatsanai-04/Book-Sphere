require("dotenv").config();
const connectDB = require("../src/config/db");
const User = require("../src/models/user.model");

const email = process.argv[2]?.toLowerCase().trim();
if (!email) {
  console.error("Usage: npm run promote-admin -- admin@example.com");
  process.exit(1);
}

connectDB().then(async () => {
  const user = await User.findOneAndUpdate({ email }, { $addToSet: { roles: "admin" } }, { new: true });
  if (!user) throw new Error("No user exists with that email");
  console.log(`${user.email} is now an admin`);
  await User.db.close();
}).catch((error) => { console.error(error.message); process.exit(1); });
