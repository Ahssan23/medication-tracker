import mongoose from "mongoose";




const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error("❌ MONGO_URI not found in .env file");
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);

    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;