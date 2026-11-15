const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Vocab = mongoose.models.Vocab || mongoose.model(
  "Vocab",
  new mongoose.Schema(
    {
      en: { type: String, required: true },
      ur: { type: String, default: "" },
      mediaPath: { type: String, default: "" },
    },
    { timestamps: true }
  )
);

// GET /api/vocab -> Text to Sign ke liye words (login ki zaroorat nahi)
router.get("/", async (req, res) => {
  const words = await Vocab.find({ mediaPath: { $ne: "" } }).sort({ en: 1 }).lean();
  res.json(words.map((w) => ({ en: w.en, ur: w.ur, mediaPath: w.mediaPath })));
});

module.exports = router;