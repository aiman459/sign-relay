const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();
const ObjectId = mongoose.Types.ObjectId;

const Vocab = mongoose.models.Vocab || mongoose.model(
  "Vocab",
  new mongoose.Schema({ en: { type: String, required: true }, ur: { type: String, default: "" }, mediaPath: { type: String, default: "" } }, { timestamps: true })
);

const ActivityLog = mongoose.models.ActivityLog || mongoose.model(
  "ActivityLog",
  new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, action: String, detail: String, data: { type: mongoose.Schema.Types.Mixed }, restored: { type: Boolean, default: false } }, { timestamps: true })
);

function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id || payload.userId || payload._id || payload.sub;
    if (!req.userId) throw new Error("no user id");
    next();
  } catch (e) {
    res.status(401).json({ message: "Pehle login karein" });
  }
}

// database mein role "admin" wale user hi aage ja sakte hain
async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const u = await mongoose.connection.collection("users").findOne({ _id: new ObjectId(req.userId) });
      if (!u || u.role !== "admin") return res.status(403).json({ message: "Sirf admin" });
      req.admin = u;
      next();
    } catch (e) {
      res.status(500).json({ message: "server error" });
    }
  });
}

async function log(userId, action, detail, data) {
  try { await ActivityLog.create({ userId, action, detail, data }); } catch (e) { /* log fail ho to app na rukay */ }
}

// GET /api/admin/check -> 200 agar admin hai
router.get("/check", requireAdmin, (req, res) => res.json({ ok: true }));

// GET /api/admin/users -> sab users (password ke bagair)
router.get("/users", requireAdmin, async (req, res) => {
  const users = await mongoose.connection.collection("users")
    .find({}, { projection: { password: 0, resetToken: 0, resetTokenExpires: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(users);
});

// GET /api/admin/vocab
router.get("/vocab", requireAdmin, async (req, res) => {
  res.json(await Vocab.find().sort({ en: 1 }).lean());
});

// POST /api/admin/vocab  { en, ur }
router.post("/vocab", requireAdmin, async (req, res) => {
  const en = ((req.body && req.body.en) || "").trim();
  const ur = ((req.body && req.body.ur) || "").trim();
  const mediaPath = ((req.body && req.body.mediaPath) || "").trim();
  if (!en) return res.status(400).json({ message: "English word likhein" });
  // sirf simple file name (jaise water.mp4) qabool hai, kisi aur path ya folder ka nahi
  if (!/^[a-z0-9_\-]+\.mp4$/i.test(mediaPath)) return res.status(400).json({ message: "Video select karein" });
  const saved = await Vocab.create({ en, ur, mediaPath });
  await log(req.admin._id, "vocab_add", en);
  res.status(201).json(saved.toObject());
});

// DELETE /api/admin/vocab/:id
router.delete("/vocab/:id", requireAdmin, async (req, res) => {
  const doc = await Vocab.findByIdAndDelete(req.params.id);
  if (doc) {
    await log(req.admin._id, "vocab_delete", doc.en, { en: doc.en, ur: doc.ur, mediaPath: doc.mediaPath });
  }
  res.json({ deleted: !!doc });
});

// GET /api/admin/logs -> aakhri 200 actions
router.get("/logs", requireAdmin, async (req, res) => {
  res.json(await ActivityLog.find().sort({ createdAt: -1 }).limit(200).lean());
});

// POST /api/admin/logs/:id/restore -> delete wala word log ki copy se wapas
router.post("/logs/:id/restore", requireAdmin, async (req, res) => {
  const entry = await ActivityLog.findById(req.params.id);
  if (!entry || entry.action !== "vocab_delete" || !entry.data) {
    return res.status(400).json({ message: "Is log se restore nahi ho sakta" });
  }
  if (entry.restored) return res.status(400).json({ message: "Ye word pehle hi restore ho chuka hai" });
  const exists = await Vocab.findOne({ en: entry.data.en });
  if (exists) return res.status(409).json({ message: "Ye word pehle se maujood hai" });
  const saved = await Vocab.create({
    en: entry.data.en,
    ur: entry.data.ur || "",
    mediaPath: entry.data.mediaPath || "",
  });
  entry.restored = true;
  await entry.save();
  await log(req.admin._id, "vocab_restore", entry.data.en);
  res.status(201).json(saved.toObject());
});

// DELETE /api/admin/logs -> saare logs delete (sirf admin)
router.delete("/logs", requireAdmin, async (req, res) => {
  const r = await ActivityLog.deleteMany({});
  res.json({ deleted: r.deletedCount });
});

module.exports = router;