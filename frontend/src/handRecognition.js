// SignRelay — live alphabet recognition (runs fully in the browser)
// camera frame -> MediaPipe hand landmarks -> small neural network -> letter (English + Urdu)

import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { newCommitState, decide } from "./commitLogic";

const MODELS = (import.meta.env.BASE_URL || "/") + "models/";

const CONFIDENCE_MIN = 0.7; // SRS: below 70% -> "Low Confidence"
const SMOOTH_FRAMES = 8;
// words mode: stricter, because the handshape model also fires on random hand poses
const THRESHOLDS = { ur: [0.7, 15], en: [0.7, 15], words: [0.9, 25], twohand: [0.9, 25] };    // average the last few frames so the answer does not flicker
const MIN_FRAME_MS = 40;    // about 25 frames per second at most

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

/* ---------- the small neural network (weights come from alphabet_model_v1.json) ---------- */

export function buildNet(json) {
  return {
    classes: json.classes,
    layers: json.layers.map((L) => {
      const inN = L.W.length;
      const outN = L.b.length;
      const W = new Float32Array(inN * outN);
      for (let i = 0; i < inN; i++) {
        for (let j = 0; j < outN; j++) W[i * outN + j] = L.W[i][j];
      }
      return { W, b: Float32Array.from(L.b), inN, outN };
    }),
  };
}

// 21 world-landmarks -> 63 numbers: move the wrist to 0, scale by wrist-to-middle-knuckle distance
export function normalizeHand(P) {
  const w = P[0];
  const dx = P[9].x - w.x, dy = P[9].y - w.y, dz = P[9].z - w.z;
  const s = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
  const out = new Float32Array(63);
  for (let i = 0; i < 21; i++) {
    out[3 * i] = (P[i].x - w.x) / s;
    out[3 * i + 1] = (P[i].y - w.y) / s;
    out[3 * i + 2] = (P[i].z - w.z) / s;
  }
  return out;
}

// returns the probability of every letter (they add up to 1)
export function predict(net, x) {
  let h = x;
  net.layers.forEach((L, li) => {
    const out = new Float32Array(L.outN);
    for (let j = 0; j < L.outN; j++) out[j] = L.b[j];
    for (let i = 0; i < L.inN; i++) {
      const v = h[i];
      if (v === 0) continue;
      const row = i * L.outN;
      for (let j = 0; j < L.outN; j++) out[j] += v * L.W[row + j];
    }
    if (li < net.layers.length - 1) {
      for (let j = 0; j < L.outN; j++) if (out[j] < 0) out[j] = 0;
    }
    h = out;
  });
  let max = -Infinity;
  for (let j = 0; j < h.length; j++) if (h[j] > max) max = h[j];
  let sum = 0;
  const p = new Float32Array(h.length);
  for (let j = 0; j < h.length; j++) { p[j] = Math.exp(h[j] - max); sum += p[j]; }
  for (let j = 0; j < p.length; j++) p[j] /= sum;
  return p;
}

/* ---------- loading (once per page, then cached) ---------- */

async function getJson(name) {
  const res = await fetch(MODELS + name);
  if (!res.ok) throw new Error("Could not load /models/" + name);
  return res.json();
}

const netPromises = {};
const landmarkerPromises = {}; // one landmarker per setting (1 hand, or 2 hands for Words)

// SWAP_HANDS: agar app mein Left aur Right ulte lagein to true karein
const SWAP_HANDS = false;

// conf: detection threshold. Words model was trained with 0.3, so Words mode uses 0.3 too.
function loadLandmarker(numHands = 1, conf = 0.5) {
  const key = numHands + "_" + conf;
  if (!landmarkerPromises[key]) {
    landmarkerPromises[key] = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(MODELS + "wasm");
      return HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODELS + "hand_landmarker.task", delegate: "CPU" },
        runningMode: "VIDEO",
        numHands,
        minHandDetectionConfidence: conf,
        minHandPresenceConfidence: conf,
        minTrackingConfidence: conf,
      });
    })().catch((e) => {
      delete landmarkerPromises[key]; // allow a retry
      throw e;
    });
  }
  return landmarkerPromises[key];
}

// Words mode: 126 numbers = Left hand (63) + Right hand (63). Absent hand stays zero.
function twoHandInput(res) {
  const x = new Float32Array(126);
  const hands = (res.worldLandmarks || []).map((wl, i) => ({
    wl,
    px: res.landmarks && res.landmarks[i] ? res.landmarks[i][0].x : 0,
  }));
  hands.sort((a, b) => a.px - b.px);
  if (hands.length === 1) {
    x.set(normalizeHand(hands[0].wl), 63);
  } else if (hands.length >= 2) {
    const first = SWAP_HANDS ? 1 : 0;
    x.set(normalizeHand(hands[first].wl), 0);
    x.set(normalizeHand(hands[1 - first].wl), 63);
  }
  return x;
}

// lang: "ur" (Urdu alphabets) or "en" (English letters). Each model is loaded once.
export function loadRecognizer(lang = "ur") {
  if (!netPromises[lang]) {
    const FILES = {
      ur: ["alphabet_model_v1.json", "alphabet_labels.json"],
      en: ["en_model_v1.json", "en_labels.json"],
      words: ["words_model_v1.json", "words_labels.json"],
      twohand: ["twohand_model_v1.json", "twohand_labels.json"],
    };
    const [netFile, labelFile] = FILES[lang] || FILES.ur;
    netPromises[lang] = (async () => {
      const [netJson, labelJson] = await Promise.all([getJson(netFile), getJson(labelFile)]);
      return { net: buildNet(netJson), letters: labelJson.letters };
    })().catch((e) => {
      delete netPromises[lang]; // allow a retry
      throw e;
    });
  }
  const isTwo = lang === "twohand";
  return Promise.all([netPromises[lang], loadLandmarker(isTwo ? 2 : 1, isTwo ? 0.3 : 0.5)]).then(([n, landmarker]) => ({
    net: n.net,
    letters: n.letters,
    landmarker,
  }));
}

/* ---------- drawing the hand skeleton over the video ---------- */

// lists: one 21-point list per visible hand (draws every hand)
function drawHands(canvas, video, lists) {
  if (!canvas) return;
  const w = video.videoWidth, h = video.videoHeight;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  if (!lists) return;
  for (const lm of lists) {
    ctx.lineWidth = Math.max(2, w / 200);
    ctx.strokeStyle = "#0EA5A0";
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * w, lm[a].y * h);
      ctx.lineTo(lm[b].x * w, lm[b].y * h);
      ctx.stroke();
    }
    ctx.fillStyle = "#FF5A36";
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, Math.max(3, w / 130), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ---------- React hook used by the Sign to Text screen ---------- */

// active: true while the camera is running
// onCommit(letter): called once when a letter has been held steady with confidence >= 70%
// returns: phase (idle | loading | ready | error), error text, reading ({en, ur, confidence} or null when no hand)
export function useHandRecognition({ active, videoRef, canvasRef, onCommit, lang = "ur" }) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      setReading(null);
      return undefined;
    }
    let cancelled = false;
    let raf = 0;
    setPhase("loading");
    setError("");

    const st = {
      hist: [], commit: newCommitState(),
      lastTs: 0, lastVideoTime: -1, lastUi: 0,
    };

    loadRecognizer(lang)
      .then((rec) => {
        if (cancelled) return;
        setPhase("ready");

        const loop = () => {
          if (cancelled) return;
          raf = requestAnimationFrame(loop);

          const v = videoRef.current;
          if (!v || v.readyState < 2 || !v.videoWidth) return;
          const now = performance.now();
          if (now - st.lastTs < MIN_FRAME_MS) return;
          if (v.currentTime === st.lastVideoTime) return;
          st.lastTs = now;
          st.lastVideoTime = v.currentTime;

          let res;
          try {
            res = rec.landmarker.detectForVideo(v, now);
          } catch (e) {
            return;
          }

          const found = res.landmarks && res.landmarks.length > 0 &&
                        res.worldLandmarks && res.worldLandmarks.length > 0;
          drawHands(canvasRef.current, v, found ? res.landmarks : null);

          if (!found) {
            st.hist = [];
            decide(st.commit, "", 0, false);
            if (now - st.lastUi > 120) { st.lastUi = now; setReading(null); }
            return;
          }

          const probs = predict(rec.net, lang === "twohand" ? twoHandInput(res) : normalizeHand(res.worldLandmarks[0]));
          st.hist.push(probs);
          if (st.hist.length > SMOOTH_FRAMES) st.hist.shift();

          const avg = new Float32Array(probs.length);
          for (const p of st.hist) for (let k = 0; k < avg.length; k++) avg[k] += p[k] / st.hist.length;
          let best = 0;
          for (let k = 1; k < avg.length; k++) if (avg[k] > avg[best]) best = k;

          const name = rec.net.classes[best];
          const letter = rec.letters[name] || { en: name, ur: "" };
          const confidence = avg[best];

          // "none" = model saw a hand but no sign: treat it like no hand (never commit a word)
          if (name === "none") {
            decide(st.commit, "", 0, false);
            if (now - st.lastUi > 120) { st.lastUi = now; setReading(null); }
            return;
          }

          if (now - st.lastUi > 120) {
            st.lastUi = now;
            setReading({ en: letter.en, ur: letter.ur, confidence: Math.round(confidence * 100) });
          }

          const [minC, holdN] = THRESHOLDS[lang] || THRESHOLDS.ur;
          const add = decide(st.commit, name, confidence, true, minC, holdN);
          if (add) commitRef.current({ en: letter.en, ur: letter.ur });
        };

        raf = requestAnimationFrame(loop);
      })
      .catch((e) => {
        if (cancelled) return;
        setPhase("error");
        setError(
          (e && e.message ? e.message : "Unknown error") +
          ". Check that public/models has 3 files and public/models/wasm has 4 files."
        );
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      const c = canvasRef.current;
      if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
      setReading(null);
    };
  }, [active, videoRef, canvasRef, lang]);

  return { phase, error, reading };
}