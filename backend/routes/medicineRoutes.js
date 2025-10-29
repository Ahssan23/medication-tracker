const express = require("express");
const Medicine = require("../models/Medicine");
const router = express.Router();

// ✅ Add Medicine
router.post("/add", async (req, res) => {
  try {
    const { userId, name, startDate, endDate, medicineTime } = req.body;
    const medicine = await Medicine.create({
      userId,
      name,
      startDate,
      endDate,
      medicineTime,
    });

    res.status(201).json(medicine);
  } catch (err) {
    res.status(500).json({ message: "Error saving medicine" });
  }
});

// ✅ Get all medicines for a user
router.get("/:userId", async (req, res) => {
  try {
    const medicines = await Medicine.find({ userId: req.params.userId });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ message: "Error fetching medicines" });
  }
});

// ✅ Update a medicine
router.put("/update/:id", async (req, res) => {
  try {
    const updated = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Medicine not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating medicine" });
  }
});

// ✅ Delete a medicine
router.delete("/delete/:id", async (req, res) => {
  try {
    const deleted = await Medicine.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Medicine not found" });
    res.json({ message: "Medicine deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting medicine" });
  }
});

module.exports = router;
