const mongoose = require("mongoose");

let connectionPromise;
const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured");
    connectionPromise ||= mongoose.connect(process.env.MONGO_URI).then(() => mongoose.connection);
    return connectionPromise;
};
module.exports = connectDB;