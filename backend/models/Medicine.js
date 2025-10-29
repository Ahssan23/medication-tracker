const mongoose = require("mongoose");

const MedicineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: String,
  startDate: String,
  endDate: String,
  medicineTime: String,
});

module.exports = mongoose.model("Medicine", MedicineSchema);
