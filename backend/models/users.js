const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      required: true,
      index: true,
    },

    phone: { type: String, trim: true },

    password: { type: String, required: true }, // hashed password

    role: {
      type: String,
      enum: ["user", "provider", "admin"],
      default: "user",
    },

    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },

    skills: [{ type: String, trim: true }],

    hourlyRate: { type: Number, default: 0 },

    portfolio: [
      {
        url: { type: String, trim: true },
        type: { type: String, trim: true },
      },
    ],

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// ✅ small helper method already correct
userSchema.methods.isAdmin = function () {
  return this.role === "admin";
};

// ✅ Keep model name capitalized & singular → "User"
module.exports = mongoose.model("User", userSchema);
