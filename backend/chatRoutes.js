const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();

const ChatMessage = mongoose.models.ChatMessage || mongoose.model(
  "ChatMessage",
  new mongoose.Schema(
    {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
      sender: { type: String, enum: ["deaf", "hearing"], required: true },
      en: { type: String, default: "" },
      ur: { type: String, default: "" },
      text: { type: String, default: "" },
    },
    { timestamps: true }
  )
);

// token se user pehchanna (login par backend jo token banata hai usi ka istemal)
function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id || payload.userId || payload._id || payload.sub;
    if (!req.userId) throw new Error("no user id in token");
    next();
  } catch (e) {
    res.status(401).json({ message: "Pehle login karein" });
  }
}

// GET /api/chat -> is user ki saari chat (purani se nayi tak)
router.get("/", requireAuth, async (req, res) => {
  const msgs = await ChatMessage.find({ userId: req.userId })
    .sort({ createdAt: 1 })
    .limit(500)
    .lean();
  res.json(msgs);
});

// POST /api/chat -> naya message save karein
router.post("/", requireAuth, async (req, res) => {
  const { sender, en, ur, text } = req.body || {};
  if (sender !== "deaf" && sender !== "hearing") {
    return res.status(400).json({ message: "sender sahi nahi" });
  }
  if (sender === "deaf" && !(en || ur)) {
    return res.status(400).json({ message: "khali message" });
  }
  if (sender === "hearing" && !(text || "").trim()) {
    return res.status(400).json({ message: "khali message" });
  }
  const saved = await ChatMessage.create({
    userId: req.userId,
    sender,
    en: en || "",
    ur: ur || "",
    text: (text || "").trim(),
  });
  res.status(201).json(saved.toObject());
});

// DELETE /api/chat -> sirf is user ki saari chat delete karein
router.delete("/", requireAuth, async (req, res) => {
  const result = await ChatMessage.deleteMany({ userId: req.userId });
  res.json({ deleted: result.deletedCount });
});

module.exports = router;