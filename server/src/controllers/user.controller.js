const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const tokenFor = (user) => jwt.sign(
  { sub: user._id.toString(), roles: user.roles },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
);

const authResponse = (res, status, user) => res.status(status).json({
  token: tokenFor(user),
  user: user.toPublicJSON(),
});

const register = async (req, res, next) => {
  try {
    const { displayName, email, password } = req.body;
    if (!displayName || !email || !password) return res.status(400).json({ message: "displayName, email and password are required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "This email is already registered" });

    const user = await User.create({ displayName, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
    authResponse(res, 201, user);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Invalid email or password" });
    if (user.status !== "active") return res.status(403).json({ message: "This account is suspended" });
    authResponse(res, 200, user);
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const allowed = ["displayName", "avatarUrl", "authorProfile"];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const user = await User.findByIdAndUpdate(req.auth.sub, changes, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

const becomeAuthor = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.auth.sub,
      { $addToSet: { roles: "author" } },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateMe, becomeAuthor };
