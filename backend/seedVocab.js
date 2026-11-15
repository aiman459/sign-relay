// ek dafa chalayein: node seedVocab.js  (backend folder se)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const file = path.join(__dirname, "..", "signrelay-app", "public", "tts", "index.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const Vocab = mongoose.models.Vocab || mongoose.model(
    "Vocab",
    new mongoose.Schema({ en: { type: String, required: true }, ur: { type: String, default: "" }, mediaPath: { type: String, default: "" } }, { timestamps: true })
  );
  for (const w of data.words) {
    await Vocab.updateOne({ en: w.en }, { $set: { ur: w.ur, mediaPath: w.file } }, { upsert: true });
  }
  console.log("Seeded words:", data.words.length);
  await mongoose.disconnect();
})().catch((e) => { console.error("seed error:", e.message); process.exit(1); });