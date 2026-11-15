import { useState, useEffect, useRef } from "react";
import {
  Hand, Type, MessageSquare, LayoutDashboard, Camera, CameraOff,
  Wifi, WifiOff, ShieldCheck, Send, ChevronRight,
  Eye, EyeOff, Mail, Lock, User, Users, Database, ScrollText,
  Plus, Trash2, CheckCircle2, LogOut, Play, RotateCcw,
  ArrowLeft, Settings2, Volume2
} from "lucide-react";
import { useHandRecognition } from "./handRecognition";

/* ============================================================
   DATA
   ============================================================ */

const VOCAB = [
  { en: "Help", ur: "مدد" },
  { en: "Good", ur: "اچھا" },
  { en: "No", ur: "نہیں" },
  { en: "Hospital", ur: "ہسپتال" },
  { en: "Doctor", ur: "طبیب" },
  { en: "Mother", ur: "ماں" },
  { en: "Father", ur: "باپ" },
  { en: "Name", ur: "نام" },
  { en: "Friend", ur: "دوست" },
  { en: "School", ur: "اسکول" },
  { en: "Today", ur: "آج" },
  { en: "Tomorrow", ur: "کل" },
  { en: "Hot", ur: "گرم" },
  { en: "Cold", ur: "سردی" },
  { en: "Thirsty", ur: "پیاس" },
];

const DEMO_USERS = [
  { name: "Ayesha Noor", role: "Deaf User", status: "Active", email: "ayesha@example.com" },
  { name: "Bilal Ahmed", role: "Hearing User", status: "Active", email: "bilal@example.com" },
  { name: "Mr. Asif Shehzad", role: "Admin", status: "Active", email: "asif@example.com" },
  { name: "Rida Kamal", role: "Deaf User", status: "Inactive", email: "rida@example.com" },
];

const seedLogs = () => {
  const now = Date.now();
  return VOCAB.slice(0, 6).map((v, i) => ({
    word: v.en,
    confidence: [92, 88, 65, 97, 74, 55][i],
    time: new Date(now - i * 1000 * 60 * (i + 3)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));
};

/* ============================================================
   SMALL PRESENTATIONAL PIECES
   ============================================================ */

function BridgeMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M4 22 Q16 5 28 22" stroke="var(--ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="4" cy="22" r="4" fill="var(--signal)" />
      <circle cx="28" cy="22" r="4" fill="var(--bridge)" />
    </svg>
  );
}

function BridgeHero() {
  return (
    <svg width="100%" height="120" viewBox="0 0 320 120" fill="none" style={{ display: "block" }}>
      <path d="M20 90 Q160 15 300 90" stroke="var(--ink-faint)" strokeWidth="2" fill="none" strokeDasharray="1 9" strokeLinecap="round" />
      <circle cx="20" cy="90" r="10" fill="var(--signal-soft)" stroke="var(--signal)" strokeWidth="2.5" />
      <circle cx="300" cy="90" r="10" fill="var(--bridge-soft)" stroke="var(--bridge)" strokeWidth="2.5" />
      <circle r="5" fill="var(--signal)">
        <animateMotion dur="3s" repeatCount="indefinite" path="M20 90 Q160 15 300 90" />
      </circle>
    </svg>
  );
}

function ConfidenceBar({ value }) {
  const low = value < 70;
  const color = low ? "var(--amber)" : value < 85 ? "var(--bridge)" : "var(--signal)";
  return (
    <div className="sb-confwrap">
      <div className="sb-confbar">
        <div className="sb-conffill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="sb-confval" style={{ color }}>{value}%</span>
    </div>
  );
}

function SignGlyph({ seed = 0, active = false }) {
  const rot = (seed * 37) % 30 - 15;
  return (
    <div className={"sb-signglyph" + (active ? " is-active" : "")} style={{ transform: `rotate(${rot}deg)` }}>
      <Hand size={22} strokeWidth={2} />
    </div>
  );
}

function PillTabs({ options, value, onChange }) {
  return (
    <div className="sb-pilltabs">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={"sb-pilltab" + (value === opt.value ? " is-active" : "")}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   CAMERA HOOK (graceful fallback if permission unavailable)
   ============================================================ */

function useCamera(active) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!active) return;
      setStatus("loading");
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("unsupported");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("ready");
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    }
    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStatus("idle");
    };
  }, [active]);

  // The <video> element only exists once status is "ready", so attach the stream then.
  useEffect(() => {
    if (status === "ready" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [status]);

  return { videoRef, status };
}

/* ============================================================
   ONBOARDING
   ============================================================ */

const SLIDES = [
  {
    icon: <BridgeHero />,
    title: "Bridging Silence & Sound",
    text: "SignRelay turns Pakistan Sign Language into English & Urdu text \u2014 instantly, right inside your browser.",
  },
  {
    icon: <WifiOff size={44} strokeWidth={1.6} />,
    title: "Works Without Internet",
    text: "After your first visit, everything runs offline. Your camera video is never uploaded \u2014 all processing stays on your device.",
  },
  {
    icon: <MessageSquare size={44} strokeWidth={1.6} />,
    title: "Real Conversations, Both Ways",
    text: "Sign to text for hearing users, type to sign for deaf users \u2014 one shared, natural conversation.",
  },
];

function Onboarding({ onDone }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  return (
    <div className="sb-screen sb-onboard">
      <button className="sb-skip" onClick={onDone} type="button">Skip</button>
      <div className="sb-onboard-art">{SLIDES[i].icon}</div>
      <h2 className="sb-onboard-title">{SLIDES[i].title}</h2>
      <p className="sb-onboard-text">{SLIDES[i].text}</p>
      <div className="sb-dots">
        {SLIDES.map((_, idx) => (
          <span key={idx} className={"sb-dot" + (idx === i ? " is-active" : "")} />
        ))}
      </div>
      <button
        className="sb-btn sb-btn-primary sb-btn-wide"
        onClick={() => (last ? onDone() : setI(i + 1))}
        type="button"
      >
        {last ? "Get Started" : "Next"} <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ============================================================
   AUTH
   ============================================================ */

const API_BASE = "http://localhost:5000/api/auth";

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [role, setRole] = useState("deaf");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwLocked, setPwLocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      if (!email.includes("@")) {
        setError("Please enter a valid email address");
        return;
      }
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (password.length < 8 || !hasLetter || !hasNumber) {
        setError("Password must contain at least 8 characters, including numbers and letters");
        return;
      }
    }

    if (mode === "forgot") {
      if (!email.includes("@")) {
        setError("Please enter a valid email address");
        return;
      }
      setLoading(true);
      try {
        await fetch(API_BASE + "/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setForgotSent(true);
      } catch (err) {
        setError("Could not reach the server. Is the backend running?");
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/login" : "/register";
      const body = mode === "login"
        ? { email, password }
        : { name, email, password, role };

      const res = await fetch(API_BASE + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }

      onAuthed(data.user, data.token);
    } catch (err) {
      setError("Could not reach the server. Is the backend running?");
      setLoading(false);
    }
  };

  if (mode === "forgot") {
    return (
      <div className="sb-screen sb-auth">
        <div className="sb-auth-logo"><BridgeMark size={44} /></div>
        <h2 className="sb-auth-title">Reset your password</h2>
        <p className="sb-auth-sub">Enter your email and we'll send you a reset link.</p>

        {forgotSent ? (
          <div className="sb-forgot-sent">
            <ShieldCheck size={22} />
            <p>If that email is registered, a reset link has been sent. Check your inbox (and spam folder).</p>
          </div>
        ) : (
          <form className="sb-form" onSubmit={handleSubmit}>
            <label className="sb-field">
              <Mail size={16} className="sb-field-icon" />
              <input type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {error && <p className="sb-auth-error">{error}</p>}
            <button className="sb-btn sb-btn-primary sb-btn-wide" type="submit" disabled={loading}>
              {loading ? "Sending\u2026" : "Send Reset Link"}
            </button>
          </form>
        )}

        <button className="sb-guest-btn" onClick={() => { setMode("login"); setError(""); setForgotSent(false); }} type="button">
          {"\u2190"} Back to Log In
        </button>
      </div>
    );
  }

  return (
    <div className="sb-screen sb-auth">
      <div className="sb-auth-logo"><BridgeMark size={44} /></div>
      <h2 className="sb-auth-title">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
      <p className="sb-auth-sub">Sign in to start bridging conversations.</p>

      <PillTabs
        options={[{ label: "Log In", value: "login" }, { label: "Register", value: "register" }]}
        value={mode}
        onChange={(v) => { setMode(v); setError(""); }}
      />

      <form className="sb-form" onSubmit={handleSubmit} autoComplete="off">
        {mode === "register" && (
          <label className="sb-field">
            <User size={16} className="sb-field-icon" />
            <input placeholder="Full name" required autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="sb-field">
          <Mail size={16} className="sb-field-icon" />
          <input type="email" name="sr-email" placeholder="Email address" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="sb-field">
          <Lock size={16} className="sb-field-icon" />
          <input
            type={showPw ? "text" : "password"}
            name="sr-secret"
            placeholder="Password"
            required
            autoComplete="new-password"
            readOnly={pwLocked}
            onFocus={() => setPwLocked(false)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="sb-field-eye" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </label>

        {mode === "login" && (
          <button type="button" className="sb-forgot-link" onClick={() => { setMode("forgot"); setError(""); }}>
            Forgot password?
          </button>
        )}

        {mode === "register" && password.length > 0 && (
          <div className="sb-pw-hints">
            <span className={"sb-pw-hint" + (password.length >= 8 ? " is-met" : "")}>
              {password.length >= 8 ? <CheckCircle2 size={12} /> : <span className="sb-pw-dot" />} 8+ characters
            </span>
            <span className={"sb-pw-hint" + (/[a-zA-Z]/.test(password) ? " is-met" : "")}>
              {/[a-zA-Z]/.test(password) ? <CheckCircle2 size={12} /> : <span className="sb-pw-dot" />} A letter (a-z)
            </span>
            <span className={"sb-pw-hint" + (/[0-9]/.test(password) ? " is-met" : "")}>
              {/[0-9]/.test(password) ? <CheckCircle2 size={12} /> : <span className="sb-pw-dot" />} A number (0-9)
            </span>
          </div>
        )}

        {mode === "register" && (
          <div className="sb-role-pick">
            <span className="sb-role-label">I am a</span>
            <div className="sb-role-options">
              <button type="button" className={"sb-role-opt" + (role === "deaf" ? " is-active" : "")} onClick={() => setRole("deaf")}>
                <Hand size={16} /> Deaf / Hard-of-Hearing
              </button>
              <button type="button" className={"sb-role-opt" + (role === "hearing" ? " is-active" : "")} onClick={() => setRole("hearing")}>
                <Users size={16} /> Hearing
              </button>
            </div>
          </div>
        )}

        {error && <p className="sb-auth-error">{error}</p>}

        <button className="sb-btn sb-btn-primary sb-btn-wide" type="submit" disabled={loading}>
          {loading ? "Please wait\u2026" : mode === "login" ? "Log In" : "Create Account"}
        </button>
      </form>

      <button className="sb-guest-btn" onClick={() => onAuthed({ name: "Guest", role: "hearing" }, null)} type="button">
        Skip sign up — explore the demo
      </button>

      <div className="sb-trust">
        <ShieldCheck size={15} />
        Your webcam video is processed only on your device — never uploaded.
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */

function ResetPasswordScreen({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (password.length < 8 || !hasLetter || !hasNumber) {
      setError("Password must contain at least 8 characters, including numbers and letters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_BASE + "/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError("Could not reach the server. Is the backend running?");
      setLoading(false);
    }
  };

  return (
    <div className="sb-screen sb-auth">
      <div className="sb-auth-logo"><BridgeMark size={44} /></div>
      <h2 className="sb-auth-title">Set a new password</h2>
      <p className="sb-auth-sub">Choose a new password for your SignRelay account.</p>

      {success ? (
        <div className="sb-forgot-sent">
          <ShieldCheck size={22} />
          <p>Your password has been reset successfully.</p>
          <button className="sb-btn sb-btn-primary sb-btn-wide" onClick={onDone} type="button">
            Go to Log In
          </button>
        </div>
      ) : (
        <form className="sb-form" onSubmit={handleSubmit}>
          <label className="sb-field">
            <Lock size={16} className="sb-field-icon" />
            <input type={showPw ? "text" : "password"} placeholder="New password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="sb-field-eye" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </label>

          {password.length > 0 && (
            <div className="sb-pw-hints">
              <span className={"sb-pw-hint" + (password.length >= 8 ? " is-met" : "")}>
                {password.length >= 8 ? <CheckCircle2 size={12} /> : <span className="sb-pw-dot" />} 8+ characters
              </span>
              <span className={"sb-pw-hint" + (/[a-zA-Z]/.test(password) ? " is-met" : "")}>
                {/[a-zA-Z]/.test(password) ? <CheckCircle2 size={12} /> : <span className="sb-pw-dot" />} A letter (a-z)
              </span>
              <span className={"sb-pw-hint" + (/[0-9]/.test(password) ? " is-met" : "")}>
                {/[0-9]/.test(password) ? <CheckCircle2 size={12} /> : <span className="sb-pw-dot" />} A number (0-9)
              </span>
            </div>
          )}

          {error && <p className="sb-auth-error">{error}</p>}

          <button className="sb-btn sb-btn-primary sb-btn-wide" type="submit" disabled={loading}>
            {loading ? "Please wait\u2026" : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}

function Dashboard({ onNavigate, onAdmin, user }) {
  const cards = [
    { key: "signtotext", icon: <Hand size={22} />, title: "Sign to Text", desc: "Show a PSL sign to your webcam and get instant English & Urdu text.", tint: "signal" },
    { key: "texttosign", icon: <Type size={22} />, title: "Text to Sign", desc: "Type a word or sentence and watch it play back as PSL signs.", tint: "bridge" },
    { key: "chat", icon: <MessageSquare size={22} />, title: "Two-Way Chat", desc: "A shared conversation \u2014 sign to text, and text to sign, together.", tint: "amber" },
  ];
  return (
    <div className="sb-screen sb-dashboard">
      <div className="sb-dash-greet">
        <p className="sb-dash-eyebrow">Assalam-o-Alaikum, {user?.name || "Guest"}</p>
        <h2 className="sb-dash-title">What would you like to do?</h2>
      </div>

      <div className="sb-status-row">
        <span className="sb-status-chip"><Wifi size={13} /> Works Offline</span>
        <span className="sb-status-chip"><CheckCircle2 size={13} /> 30–50 Words Ready</span>
      </div>

      <div className="sb-cards">
        {cards.map((c) => (
          <button key={c.key} className={"sb-card sb-tint-" + c.tint} onClick={() => onNavigate(c.key)} type="button">
            <div className="sb-card-icon">{c.icon}</div>
            <div className="sb-card-body">
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
            <ChevronRight size={18} className="sb-card-arrow" />
          </button>
        ))}
      </div>

      <button className="sb-admin-link" onClick={onAdmin} type="button">
        <Settings2 size={14} /> Administrator? Open Admin Panel
      </button>
    </div>
  );
}

/* ============================================================
   SIGN TO TEXT
   ============================================================ */

function SignToText() {
  const [capturing, setCapturing] = useState(false);
  const { videoRef, status } = useCamera(capturing);
  const canvasRef = useRef(null);
  const [sentence, setSentence] = useState([]);
  useEffect(() => { localStorage.setItem("signrelay_sentence", JSON.stringify(sentence)); }, [sentence]);
  const [lang, setLang] = useState("ur");
  const cameraReady = capturing && status === "ready";
  const { phase, error, reading } = useHandRecognition({
    active: cameraReady,
    videoRef,
    canvasRef,
    lang,
    onCommit: (letter) => setSentence((s) => [...s.slice(-11), letter]),
  });

  const showReading = cameraReady && phase === "ready" && reading;
  const lowConfidence = showReading && reading.confidence < 70;
  const urduText = sentence.map((l) => l.ur).join("");
  const englishText = sentence.map((l) => l.en).join(lang === "words" || lang === "twohand" ? " " : "");

  let message = "";
  if (!capturing) message = "Press \"Start Recognition\" and show a PSL letter to the camera.";
  else if (status === "error") message = "The camera is not available. Allow camera access in the browser, then press Start again.";
  else if (status !== "ready" || phase === "loading" || phase === "idle") message = "Getting the camera and the recognition model ready\u2026";
  else if (phase === "error") message = error;
  else message = "No hand found. Hold one hand in front of the camera.";

  return (
    <div className="sb-screen sb-module">
      <div className="sb-module-head">
        <h2><Hand size={18} /> Sign to Text</h2>
        <div className="sb-lang-toggle">
          <button type="button" className={lang === "ur" ? "is-on" : ""} onClick={() => setLang("ur")}>اردو</button>
          <button type="button" className={lang === "en" ? "is-on" : ""} onClick={() => setLang("en")}>English</button>
          <button type="button" className={lang === "words" ? "is-on" : ""} onClick={() => setLang("words")}>Words</button>
          <button type="button" className={lang === "twohand" ? "is-on" : ""} onClick={() => setLang("twohand")}>2 Hands</button>
        </div>
      </div>

      <div className="sb-camera-wrap">
        <video
          ref={videoRef}
          className="sb-camera-video"
          style={{ visibility: status === "ready" ? "visible" : "hidden" }}
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="sb-camera-canvas" />
        {status !== "ready" && (
          <div className="sb-camera-fallback">
            <Camera size={30} strokeWidth={1.5} />
            <p>{status === "error" ? "Camera unavailable. Check the browser's camera permission." : "Camera preview appears here"}</p>
          </div>
        )}
        {cameraReady && phase === "ready" && <div className="sb-scan-line" />}
        <button
          className={"sb-cam-toggle" + (capturing ? " is-on" : "")}
          onClick={() => setCapturing((c) => !c)}
          type="button"
        >
          {capturing ? <><CameraOff size={16} /> Stop</> : <><Camera size={16} /> Start Recognition</>}
        </button>
      </div>

      <div className={"sb-result-card" + (lowConfidence ? " is-low" : "")}>
        {showReading ? (
          <>
            <div className="sb-result-words">
              <div className="sb-result-en">{reading.en}</div>
              <div className="sb-result-ur" lang="ur" dir="rtl">{reading.ur}</div>
            </div>
            {lowConfidence ? (
              <p className="sb-low-msg"><RotateCcw size={14} /> Low Confidence — Please Repeat</p>
            ) : (
              <ConfidenceBar value={reading.confidence} />
            )}
          </>
        ) : (
          <p className="sb-result-empty">{message}</p>
        )}
      </div>

      <div className="sb-sentence-strip">
        <p className="sb-sentence-label">Building sentence</p>
        <div className="sb-sentence-chips">
          {sentence.length === 0 && <span className="sb-sentence-placeholder">Recognized letters will appear here{"\u2026"}</span>}
          {sentence.map((w, i) => <span key={i} className="sb-chip">{w.en}</span>)}
        </div>
        {sentence.length > 0 && (
          <>
            {lang === "ur" ? (
              <p className="sb-sentence-ur" lang="ur" dir="rtl">{urduText}</p>
            ) : (
              <p className="sb-sentence-ur" lang="en">{englishText}</p>
            )}
            <div className="sb-sentence-actions">
              <button className="sb-btn sb-btn-ghost" type="button" onClick={() => setSentence((s) => s.slice(0, -1))}>
                <ArrowLeft size={14} /> Delete last
              </button>
              <button className="sb-btn sb-btn-ghost" type="button" onClick={() => setSentence([])}>
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </>
        )}
        <p className="sb-hint">Recognizes 36 still PSL letters. Words and the 4 moving letters (آ ج ڑ ہ) are coming next.</p>
      </div>
    </div>
  );
}

/* ============================================================
   TEXT TO SIGN
   ============================================================ */

const TTS_BASE = import.meta.env.BASE_URL || "/";
const MEDIA_CACHE = "signrelay-media";
const HAS_CACHE = typeof window !== "undefined" && "caches" in window;

// splits the typed text: known words play their video; unknown words are spelled letter by letter
function tokenizeWords(text, words, letters) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const seq = [];
  const unknown = [];
  parts.forEach((p) => {
    const c = p.replace(/[^\p{L}\p{N}]/gu, "");
    if (!c) return;
    const hit = words.find((w) => w.en.toLowerCase() === c.toLowerCase() || w.ur === c);
    if (hit) {
      seq.push({ label: hit.en, ur: hit.ur, file: hit.file, type: "video", folder: "tts" });
      return;
    }
    const spelled = [];
    for (const ch of c) {
      const key = ch.toLowerCase();
      if (letters.en[key]) {
        spelled.push({ label: key.toUpperCase(), ur: "", file: letters.en[key].file, type: "video", folder: "spell" });
      } else if (letters.ur[ch]) {
        spelled.push({ label: ch, ur: ch, file: letters.ur[ch].file, type: letters.ur[ch].type, folder: "spell" });
      } else {
        spelled.length = 0;
        break;
      }
    }
    if (spelled.length) seq.push(...spelled);
    else unknown.push(c);
  });
  return { seq, unknown };
}

// every clip the Text to Sign screen can use
function clipUrls(words, letters) {
  const u = [TTS_BASE + "tts/index.json", TTS_BASE + "spell/index.json"];
  words.forEach((w) => u.push(TTS_BASE + "tts/" + w.file));
  Object.values(letters.en).forEach((v) => u.push(TTS_BASE + "spell/" + v.file));
  Object.values(letters.ur).forEach((v) => u.push(TTS_BASE + "spell/" + v.file));
  return u;
}

// index files: network first (so a new list shows up), cache when offline
async function getFresh(url) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      if (HAS_CACHE) (await caches.open(MEDIA_CACHE)).put(url, res.clone());
      return res;
    }
  } catch (e) { /* offline */ }
  if (HAS_CACHE) {
    const hit = await (await caches.open(MEDIA_CACHE)).match(url);
    if (hit) return hit;
  }
  throw new Error("offline and not cached");
}

// clips: cache first, then network (and store it)
async function getClip(url) {
  if (HAS_CACHE) {
    const cache = await caches.open(MEDIA_CACHE);
    let res = await cache.match(url);
    if (!res) {
      res = await fetch(url);
      if (res.ok) await cache.put(url, res.clone());
    }
    if (!res.ok) throw new Error("clip not found");
    return URL.createObjectURL(await res.blob());
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("clip not found");
  return URL.createObjectURL(await res.blob());
}

const VOCAB_API = "http://localhost:5000/api/vocab";

// words database se (online). Offline ho to pichli saved list (index.json) use hogi.
async function loadWordList() {
  try {
    const r = await fetch(VOCAB_API);
    if (!r.ok) throw new Error("vocab api");
    const d = await r.json();
    return d.filter((w) => w.mediaPath).map((w) => ({ en: w.en, ur: w.ur, file: w.mediaPath }));
  } catch (e) {
    const idx = await (await getFresh(TTS_BASE + "tts/index.json")).json();
    return idx.words || [];
  }
}

function TextToSign() {
  const [words, setWords] = useState([]);
  const [letters, setLetters] = useState({ en: {}, ur: {} });
  const [loadError, setLoadError] = useState("");
  const [input, setInput] = useState("");
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [unknown, setUnknown] = useState([]);
  const [clipError, setClipError] = useState("");
  const [currentSrc, setCurrentSrc] = useState("");
  const [dl, setDl] = useState({ busy: false, done: 0, total: 0, ready: false });
  const videoRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setWords(await loadWordList());
      } catch (e) {
        setLoadError("Video list nahi mili. Internet chahiye, ya pehle offline download karein.");
      }
      try {
        const d = await (await getFresh(TTS_BASE + "spell/index.json")).json();
        setLetters({ en: d.en || {}, ur: d.ur || {} });
      } catch (e) { /* letters optional */ }
    })();
  }, []);

  // is device par sab clips cache mein hain?
  useEffect(() => {
    if (!words.length || !HAS_CACHE) return;
    (async () => {
      const cache = await caches.open(MEDIA_CACHE);
      const urls = clipUrls(words, letters);
      let n = 0;
      for (const u of urls) if (await cache.match(u)) n++;
      setDl((d) => ({ ...d, done: n, total: urls.length, ready: urls.length > 0 && n === urls.length }));
    })();
  }, [words, letters]);

  const downloadOffline = async () => {
    if (!HAS_CACHE) return;
    const urls = clipUrls(words, letters);
    const cache = await caches.open(MEDIA_CACHE);
    setDl({ busy: true, done: 0, total: urls.length, ready: false });
    let n = 0;
    for (const u of urls) {
      try {
        if (!(await cache.match(u))) {
          const res = await fetch(u);
          if (res.ok) await cache.put(u, res);
        }
        n++;
      } catch (e) { /* skip this file */ }
      setDl((d) => ({ ...d, done: n }));
    }
    setDl({ busy: false, done: n, total: urls.length, ready: n === urls.length });
  };

  // play the item at idx: a video plays until it ends, a photo stays for 1.5 seconds
  useEffect(() => {
    if (idx < 0 || idx >= queue.length) return undefined;
    const item = queue[idx];
    let alive = true;
    setClipError("");
    getClip(TTS_BASE + item.folder + "/" + item.file)
      .then((blobUrl) => {
        if (!alive) return;
        setCurrentSrc(blobUrl);
        if (item.type === "image") {
          setTimeout(() => {
            if (alive) setIdx((i) => (i + 1 < queue.length ? i + 1 : -1));
          }, 1500);
        } else if (videoRef.current) {
          videoRef.current.src = blobUrl;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        if (alive) setClipError("Is clip ki file nahi mili. Internet check karein, ya offline download karein.");
      });
    return () => { alive = false; };
  }, [idx, queue]);

  const play = (text = input) => {
    const { seq, unknown: unk } = tokenizeWords(text, words, letters);
    setInput(text);
    setUnknown(unk);
    setQueue(seq);
    setIdx(seq.length ? 0 : -1);
  };

  const current = idx >= 0 && idx < queue.length ? queue[idx] : null;

  return (
    <div className="sb-screen sb-module">
      <div className="sb-module-head">
        <h2><Type size={18} /> Text to Sign</h2>
        <span className="sb-demo-badge">Real PSL videos</span>
      </div>

      <div className="sb-input-row">
        <textarea
          className="sb-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a word in English or Urdu…"
          rows={2}
        />
        <button className="sb-btn sb-btn-primary" onClick={() => play()} type="button" disabled={!words.length}>
          <Play size={16} /> Play
        </button>
      </div>

      {loadError && <p className="sb-low-msg">{loadError}</p>}

      <div className="sb-t2s-stage">
        <video
          ref={videoRef}
          className="sb-t2s-video"
          playsInline
          style={{ display: current && current.type === "video" ? "block" : "none" }}
          onEnded={() => setIdx((i) => (i + 1 < queue.length ? i + 1 : -1))}
          onError={() => setClipError("Is clip ki video nahi chali.")}
        />
        {current && current.type === "image" && currentSrc && (
          <img className="sb-t2s-video" src={currentSrc} alt={current.ur} />
        )}
        {!current && (
          <p className="sb-result-empty">
            {queue.length > 0 ? "Ho gaya. Dobara dekhne ke liye Replay dabayein." : "Type a word. Or choose one below. Press Play."}
          </p>
        )}
        {clipError && <p className="sb-low-msg">{clipError}</p>}
      </div>

      {queue.length > 0 && (
        <>
          <div className="sb-sign-row">
            {queue.map((w, i) => (
              <div key={i} className={"sb-sign-card" + (i === idx ? " is-active" : "")}>
                <span className="sb-sign-card-label">{w.label}</span>
                {w.ur && <span className="sb-sentence-ur" lang="ur" dir="rtl">{w.ur}</span>}
              </div>
            ))}
          </div>
          <div className="sb-sentence-actions">
            <button className="sb-btn sb-btn-ghost" type="button" onClick={() => play(input)}>
              <RotateCcw size={14} /> Replay
            </button>
          </div>
        </>
      )}

      {unknown.length > 0 && (
        <p className="sb-low-msg">Ye spell nahi ho sake (in mein kuch huroof mojood nahi): {unknown.join("، ")}</p>
      )}

      <div className="sb-t2s-list">
        <div className="sb-sentence-chips">
          {words.map((w) => (
            <button key={w.en} type="button" className="sb-chip" onClick={() => play(w.en)}>
              {w.en}
            </button>
          ))}
        </div>
      </div>

      <div className="sb-offline-row">
        {dl.ready ? (
          <span>Ready for offline use. {dl.total} files saved.</span>
        ) : dl.busy ? (
          <span>Downloading for offline use…</span>
        ) : (
          <button className="sb-btn sb-btn-ghost" type="button" onClick={downloadOffline} disabled={!words.length || !HAS_CACHE}>
            Download for offline use
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TWO-WAY CHAT
   ============================================================ */

// Text to Sign ki list ek hi dafa load hoti hai, chat ke sab players use karte hain
let signIndexPromise = null;
function loadSignIndex() {
  if (!signIndexPromise) {
    signIndexPromise = Promise.all([
      loadWordList(),
      getFresh(TTS_BASE + "spell/index.json").then((r) => r.json()).catch(() => ({ en: {}, ur: {} })),
    ])
      .then(([words, l]) => ({ words, letters: { en: l.en || {}, ur: l.ur || {} } }))
      .catch((e) => { signIndexPromise = null; throw e; });
  }
  return signIndexPromise;
}

// Hearing user ka text sign videos mein chalata hai (words + letter-by-letter spelling)
function SignPlayer({ text, autoPlay }) {
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [src, setSrc] = useState("");
  const [unknown, setUnknown] = useState([]);
  const [err, setErr] = useState("");
  const videoRef = useRef(null);

  const play = async () => {
    try {
      const { words, letters } = await loadSignIndex();
      const { seq, unknown: unk } = tokenizeWords(text, words, letters);
      setErr("");
      setUnknown(unk);
      setQueue(seq);
      setIdx(seq.length ? 0 : -1);
    } catch (e) {
      setErr("Sign list load nahi hui. Internet check karein.");
    }
  };

  useEffect(() => { if (autoPlay) play(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (idx < 0 || idx >= queue.length) return undefined;
    const item = queue[idx];
    let alive = true;
    getClip(TTS_BASE + item.folder + "/" + item.file)
      .then((blobUrl) => {
        if (!alive) return;
        setSrc(blobUrl);
        if (item.type === "image") {
          setTimeout(() => { if (alive) setIdx((i) => (i + 1 < queue.length ? i + 1 : -1)); }, 1500);
        } else if (videoRef.current) {
          videoRef.current.src = blobUrl;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => { if (alive) setErr("Is clip ki video nahi chali."); });
    return () => { alive = false; };
  }, [idx, queue]);

  const current = idx >= 0 && idx < queue.length ? queue[idx] : null;

  return (
    <div className="sb-sign-player">
      <video
        ref={videoRef}
        className="sb-t2s-video"
        playsInline
        muted
        style={{ display: current && current.type === "video" ? "block" : "none" }}
        onEnded={() => setIdx((i) => (i + 1 < queue.length ? i + 1 : -1))}
        onError={() => setErr("Is clip ki video nahi chali.")}
      />
      {current && current.type === "image" && src && (
        <img className="sb-t2s-video" src={src} alt={current.ur} />
      )}
      {queue.length > 0 && (
        <div className="sb-sign-row">
          {queue.map((w, i) => (
            <div key={i} className={"sb-sign-card" + (i === idx ? " is-active" : "")}>
              <span className="sb-sign-card-label">{w.label}</span>
              {w.ur && <span className="sb-sentence-ur" lang="ur" dir="rtl">{w.ur}</span>}
            </div>
          ))}
        </div>
      )}
      {unknown.length > 0 && <p className="sb-low-msg">Ye spell nahi ho sake: {unknown.join("، ")}</p>}
      {err && <p className="sb-low-msg">{err}</p>}
      <button className="sb-btn sb-btn-ghost" type="button" onClick={play}>
        <RotateCcw size={13} /> Play signs
      </button>
    </div>
  );
}

const CHAT_API = "http://localhost:5000/api/chat";

function chatHeaders() {
  return { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("signrelay_token") };
}

function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState("");
  const [input, setInput] = useState("");
  const [freshId, setFreshId] = useState(null);
  const endRef = useRef(null);

  // chat history database se load karein
  useEffect(() => {
    fetch(CHAT_API, { headers: chatHeaders() })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "error");
        setMessages(d);
      })
      .catch((e) => setNotice("Chat load nahi hui: " + e.message));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const save = async (msg) => {
    try {
      const r = await fetch(CHAT_API, { method: "POST", headers: chatHeaders(), body: JSON.stringify(msg) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "error");
      setMessages((m) => [...m, d]);
      if (d.sender === "hearing") setFreshId(d._id);
    } catch (e) {
      setNotice("Message save nahi hua. Backend chal raha hai?");
    }
  };

  // sirf is user ki chat delete hoti hai
  const clearChat = async () => {
    if (!window.confirm("Aap ki saari chat delete ho jayegi. Pakka?")) return;
    try {
      const r = await fetch(CHAT_API, { method: "DELETE", headers: chatHeaders() });
      if (!r.ok) throw new Error("error");
      setMessages([]);
      setFreshId(null);
      setNotice("Chat clear ho gayi.");
    } catch (e) {
      setNotice("Could not clear the chat. Please try again.");
    }
  };

  const sendHearing = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    save({ sender: "hearing", text: t });
  };

  // Sign to Text screen par bana sentence chat mein bhejein
  const sendSignSentence = () => {
    let items = [];
    try { items = JSON.parse(localStorage.getItem("signrelay_sentence") || "[]"); } catch (e) { items = []; }
    if (!items.length) {
      setNotice("No signs yet. Try Sign to Text first.");
      return;
    }
    setNotice("");
    localStorage.setItem("signrelay_sentence", "[]"); // ek dafa bhejne ke baad clear
    save({
      sender: "deaf",
      en: items.map((i) => i.en).join(" "),
      ur: items.map((i) => i.ur).join(" "),
    });
  };

  return (
    <div className="sb-screen sb-module sb-chat">
      <div className="sb-module-head">
        <h2><MessageSquare size={18} /> Two-Way Chat</h2>
      </div>

      <div className="sb-chat-log">
        {messages.map((m, i) => (
          <div key={m._id || i} className={"sb-bubble-row " + (m.sender === "deaf" ? "left" : "right")}>
            <div className={"sb-bubble " + (m.sender === "deaf" ? "sb-bubble-deaf" : "sb-bubble-hearing")}>
              {m.sender === "deaf" ? (
                <>
                  <span className="sb-bubble-en">{m.en}</span>
                  <span className="sb-bubble-ur" lang="ur" dir="rtl">{m.ur}</span>
                </>
              ) : (
                <>
                  <span>{m.text}</span>
                  <SignPlayer text={m.text} autoPlay={m._id === freshId} />
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {notice && <p className="sb-low-msg">{notice}</p>}

      <div className="sb-chat-controls">
        <button className="sb-btn sb-btn-ghost" onClick={sendSignSentence} type="button">
          <Hand size={15} /> Send recognized signs
        </button>
        <button className="sb-btn sb-btn-ghost" onClick={clearChat} type="button">
          <Trash2 size={14} /> Clear chat
        </button>
      </div>

      <div className="sb-chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendHearing()}
          placeholder="Type a message for the deaf user…"
        />
        <button className="sb-send-btn" onClick={sendHearing} type="button"><Send size={16} /></button>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN
   ============================================================ */

const ADMIN_API = "http://localhost:5000/api/admin";

function adminHeaders() {
  return { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("signrelay_token") };
}

function AdminPanel({ onBack }) {
  const [allowed, setAllowed] = useState(null);
  const [tab, setTab] = useState("vocab");
  const [notice, setNotice] = useState("");
  const [vocab, setVocab] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [en, setEn] = useState("");
  const [ur, setUr] = useState("");
  const [clips, setClips] = useState([]);
  const [clip, setClip] = useState("");

  // dropdown ke liye maujood videos (public/tts ki list)
  useEffect(() => {
    fetch(TTS_BASE + "tts/index.json")
      .then((r) => r.json())
      .then((d) => setClips(d.words || []))
      .catch(() => setNotice("Video list load nahi hui."));
  }, []);

  const call = async (path, opts = {}) => {
    const r = await fetch(ADMIN_API + path, { ...opts, headers: adminHeaders() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || "Error " + r.status);
    return d;
  };

  useEffect(() => {
    call("/check").then(() => setAllowed(true)).catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    setNotice("");
    if (tab === "vocab") call("/vocab").then(setVocab).catch((e) => setNotice(e.message));
    if (tab === "users") call("/users").then(setUsers).catch((e) => setNotice(e.message));
    if (tab === "logs") call("/logs").then(setLogs).catch((e) => setNotice(e.message));
  }, [allowed, tab]);

  const addWord = async () => {
    if (!en.trim()) return;
    if (!clip) { setNotice("Please select a video."); return; }
    try {
      const w = await call("/vocab", { method: "POST", body: JSON.stringify({ en, ur, mediaPath: clip }) });
      setVocab((v) => [...v, w].sort((x, y) => x.en.localeCompare(y.en)));
      setEn("");
      setUr("");
      setClip("");
      setNotice("Word saved.");
    } catch (e) {
      setNotice(e.message);
    }
  };

  const restoreWord = async (logId) => {
    try {
      await call("/logs/" + logId + "/restore", { method: "POST" });
      setNotice("Word restored.");
      setLogs(await call("/logs"));
      setVocab(await call("/vocab"));
    } catch (e) {
      setNotice(e.message);
    }
  };

  const delWord = async (id) => {
    if (!window.confirm("Is word ko delete karna hai? Logs se restore ho sakta hai.")) return;
    try {
      await call("/vocab/" + id, { method: "DELETE" });
      setVocab((v) => v.filter((w) => w._id !== id));
    } catch (e) {
      setNotice(e.message);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm("All logs will be deleted. Are you sure?")) return;
    try {
      await call("/logs", { method: "DELETE" });
      setLogs([]);
      setNotice("Logs cleared.");
    } catch (e) {
      setNotice(e.message);
    }
  };

  const header = (
    <div className="sb-module-head">
      <button className="sb-icon-btn" onClick={onBack} type="button" aria-label="Back"><ArrowLeft size={16} /></button>
      <h2><Settings2 size={18} /> Admin Panel</h2>
    </div>
  );

  if (allowed === null) {
    return <div className="sb-screen sb-module">{header}<p className="sb-result-empty">Checking access…</p></div>;
  }
  if (!allowed) {
    return (
      <div className="sb-screen sb-module">
        {header}
        <p className="sb-low-msg">Ye page sirf admin ke liye hai.</p>
      </div>
    );
  }

  return (
    <div className="sb-screen sb-module">
      {header}

      <div className="sb-chip-row">
        {[["vocab", "Vocabulary"], ["users", "Users"], ["logs", "Logs"]].map(([k, label]) => (
          <button key={k} type="button" className={"sb-chip" + (tab === k ? " is-active" : "")} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {notice && <p className="sb-low-msg">{notice}</p>}

      {tab === "vocab" && (
        <>
          <div className="sb-admin-add">
            <input value={en} onChange={(e) => setEn(e.target.value)} placeholder="English word" />
            <input value={ur} onChange={(e) => setUr(e.target.value)} placeholder="Urdu translation" />
            <select value={clip} onChange={(e) => setClip(e.target.value)}>
              <option value="">Select video</option>
              {clips.map((c) => <option key={c.file} value={c.file}>{c.en} ({c.file})</option>)}
            </select>
            <button className="sb-btn sb-btn-primary" onClick={addWord} type="button"><Plus size={14} /> Add</button>
          </div>
          <div className="sb-admin-list">
            {vocab.map((w) => (
              <div key={w._id} className="sb-admin-row">
                <span><strong>{w.en}</strong> <span lang="ur" dir="rtl">{w.ur}</span> <span className="sb-admin-sub">{w.mediaPath}</span></span>
                <button className="sb-icon-btn" onClick={() => delWord(w._id)} type="button" aria-label="Delete"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "users" && (
        <div className="sb-admin-list">
          {users.map((u) => (
            <div key={String(u._id)} className="sb-admin-row">
              <span><strong>{u.name || "(no name)"}</strong> <span>{u.email}</span></span>
              <span className="sb-bubble-meta">{u.role} · {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ""}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div className="sb-admin-list">
          <div className="sb-admin-addrow">
            <button className="sb-btn sb-btn-ghost" onClick={clearLogs} type="button"><Trash2 size={14} /> Clear logs</button>
          </div>
          {logs.length === 0 && <p className="sb-result-empty">No Logs.</p>}
          {logs.map((l) => (
            <div key={String(l._id)} className="sb-admin-row">
              <span>{l.action}: <strong>{l.detail}</strong></span>
              {l.action === "vocab_delete" && l.data && !l.restored && (
                <button className="sb-btn sb-btn-ghost" onClick={() => restoreWord(l._id)} type="button">Restore</button>
              )}
              {l.restored && <span className="sb-bubble-meta">Restored</span>}
              <span className="sb-bubble-meta">{new Date(l.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */

const NAV = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard },
  { key: "signtotext", label: "Sign\u2192Text", icon: Hand },
  { key: "texttosign", label: "Text\u2192Sign", icon: Type },
  { key: "chat", label: "Chat", icon: MessageSquare },
];

function getStoredSession() {
  try {
    const token = localStorage.getItem("signrelay_token");
    const userStr = localStorage.getItem("signrelay_user");
    if (!token || !userStr) return null;

    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("signrelay_token");
      localStorage.removeItem("signrelay_user");
      return null;
    }
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

export default function SignRelayApp() {
  const [stage, setStage] = useState(() => (getStoredSession() ? "app" : "onboarding")); // onboarding | auth | app
  const [screen, setScreen] = useState("dashboard");
  const [user, setUser] = useState(() => getStoredSession());
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get("resetToken"));

  const authed = stage === "app";

  if (resetToken) {
    return (
      <div className="sb-root">
        <style>{CSS}</style>
        <div className="sb-shell">
          <div className="sb-body">
            <ResetPasswordScreen
              token={resetToken}
              onDone={() => {
                window.history.replaceState({}, "", window.location.pathname);
                window.location.reload();
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sb-root">
      <style>{CSS}</style>
      <div className="sb-shell">
        {stage !== "onboarding" && (
          <div className="sb-header">
            <div className="sb-header-brand">
              <BridgeMark size={28} />
              <div className="sb-header-word">
                <span className="sb-wordmark">SignRelay</span>
                <span className="sb-tagline">PSL ↔ Text, Instantly</span>
              </div>
            </div>
            {authed && (
              <button
                className="sb-icon-btn sb-logout"
                onClick={() => {
                  if (window.confirm("Log out of SignRelay? Use the bottom Home tab instead if you just want to go back.")) {
                    localStorage.removeItem("signrelay_token");
                    localStorage.removeItem("signrelay_user");
                    setUser(null);
                    setStage("onboarding");
                    setScreen("dashboard");
                  }
                }}
                type="button"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}

        <div className="sb-body">
          {stage === "onboarding" && <Onboarding onDone={() => setStage("auth")} />}
          {stage === "auth" && <AuthScreen onAuthed={(userData, token) => {
            if (token) {
              localStorage.setItem("signrelay_token", token);
              localStorage.setItem("signrelay_user", JSON.stringify(userData));
            }
            setUser(userData); setStage("app"); setScreen("dashboard");
          }} />}
          {stage === "app" && screen === "dashboard" && (
            <Dashboard onNavigate={setScreen} onAdmin={() => setScreen("admin")} user={user} />
          )}
          {stage === "app" && screen === "signtotext" && <SignToText />}
          {stage === "app" && screen === "texttosign" && <TextToSign />}
          {stage === "app" && screen === "chat" && <ChatScreen />}
          {stage === "app" && screen === "admin" && <AdminPanel onBack={() => setScreen("dashboard")} />}
        </div>

        {authed && screen !== "admin" && (
          <div className="sb-bottomnav">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = screen === n.key;
              return (
                <button key={n.key} className={"sb-navbtn" + (active ? " is-active" : "")} onClick={() => setScreen(n.key)} type="button">
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                  <span>{n.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Noto+Nastaliq+Urdu:wght@500;700&display=swap');

.sb-root{
  --ink:#1B2340; --ink-soft:#5B6478; --ink-faint:#B2BAC9;
  --paper:#EEF1F3; --surface:#FFFFFF; --border:#E1E5EA;
  --signal:#FF5A36; --signal-soft:#FFE7DF; --signal-deep:#E14322;
  --bridge:#0EA5A0; --bridge-soft:#DCF5F3; --bridge-deep:#0B8681;
  --amber:#F2A93B; --amber-soft:#FDF0D9;
  --radius-lg:22px; --radius-md:14px; --radius-sm:9px;
  --shadow-md: 0 10px 26px -12px rgba(27,35,64,0.22);
  --shadow-lg: 0 24px 56px -18px rgba(27,35,64,0.30);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  color:var(--ink);
  width:100%;
  display:flex; justify-content:center;
  padding:28px 14px;
  background:
    radial-gradient(circle at 10% 6%, rgba(255,90,54,0.09), transparent 42%),
    radial-gradient(circle at 90% 94%, rgba(14,165,160,0.10), transparent 42%),
    var(--paper);
  box-sizing:border-box;
}
.sb-root *{ box-sizing:border-box; }
.sb-root :focus-visible{ outline:2px solid var(--signal); outline-offset:2px; border-radius:6px; }

.sb-shell{
  width:100%; max-width:460px;
  background:var(--surface);
  border-radius:30px;
  box-shadow:var(--shadow-lg);
  border:1px solid var(--border);
  overflow:hidden;
  display:flex; flex-direction:column;
  min-height:760px;
  position:relative;
}

.sb-header{
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 20px 14px; border-bottom:1px solid var(--border);
  flex-shrink:0;
}
.sb-header-brand{ display:flex; align-items:center; gap:10px; }
.sb-header-word{ display:flex; flex-direction:column; line-height:1.1; }
.sb-wordmark{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:17px; letter-spacing:-0.01em; }
.sb-tagline{ font-size:10.5px; color:var(--ink-faint); font-weight:500; }
.sb-logout{ color:var(--ink-soft); }

.sb-body{ flex:1; display:flex; flex-direction:column; overflow-y:auto; }
.sb-screen{ padding:22px 20px 26px; display:flex; flex-direction:column; flex:1; animation:sbFade .35s ease; }
@keyframes sbFade{ from{ opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);} }

/* Buttons */
.sb-btn{
  font-family:'Inter',sans-serif; font-weight:600; font-size:14px;
  border:none; border-radius:var(--radius-md); cursor:pointer;
  padding:12px 18px; display:inline-flex; align-items:center; justify-content:center; gap:7px;
  transition:transform .15s ease, box-shadow .15s ease, background .15s ease;
}
.sb-btn:active{ transform:scale(0.97); }
.sb-btn-primary{ background:var(--ink); color:#fff; }
.sb-btn-primary:hover{ background:#0F1530; }
.sb-btn-ghost{ background:var(--paper); color:var(--ink); }
.sb-btn-ghost:hover{ background:var(--border); }
.sb-btn-wide{ width:100%; }

/* Onboarding */
.sb-onboard{ align-items:center; text-align:center; justify-content:center; position:relative; }
.sb-skip{ position:absolute; top:18px; right:20px; background:none; border:none; color:var(--ink-soft); font-size:13px; font-weight:600; cursor:pointer; }
.sb-onboard-art{ width:100%; max-width:280px; color:var(--signal); display:flex; align-items:center; justify-content:center; margin-bottom:18px; }
.sb-onboard-title{ font-family:'Space Grotesk',sans-serif; font-size:23px; font-weight:700; margin:4px 0 10px; letter-spacing:-0.01em; }
.sb-onboard-text{ color:var(--ink-soft); font-size:14.5px; line-height:1.55; max-width:320px; margin:0 auto 28px; }
.sb-dots{ display:flex; gap:6px; margin-bottom:22px; }
.sb-dot{ width:7px; height:7px; border-radius:50%; background:var(--border); transition:all .25s ease; }
.sb-dot.is-active{ width:20px; border-radius:5px; background:var(--signal); }

/* Auth */
.sb-auth{ align-items:stretch; }
.sb-auth-logo{ display:flex; justify-content:center; margin-bottom:14px; }
.sb-auth-title{ font-family:'Space Grotesk',sans-serif; font-size:21px; font-weight:700; text-align:center; margin:0 0 4px; }
.sb-auth-sub{ text-align:center; color:var(--ink-soft); font-size:13.5px; margin:0 0 18px; }

.sb-pilltabs{ display:flex; background:var(--paper); border-radius:12px; padding:4px; margin-bottom:18px; }
.sb-pilltab{ flex:1; border:none; background:none; padding:9px; border-radius:9px; font-weight:600; font-size:13.5px; color:var(--ink-soft); cursor:pointer; transition:all .18s ease; }
.sb-pilltab.is-active{ background:#fff; color:var(--ink); box-shadow:var(--shadow-md); }

.sb-form{ display:flex; flex-direction:column; gap:11px; }
.sb-field{ display:flex; align-items:center; gap:9px; border:1.5px solid var(--border); border-radius:var(--radius-md); padding:11px 13px; }
.sb-field:focus-within{ border-color:var(--ink); }
.sb-field-icon{ color:var(--ink-faint); flex-shrink:0; }
.sb-field input{ border:none; outline:none; flex:1; font-size:14px; font-family:'Inter',sans-serif; background:transparent; color:var(--ink); }
.sb-field-eye{ background:none; border:none; color:var(--ink-faint); cursor:pointer; padding:0; display:flex; }

.sb-pw-hints{ display:flex; flex-wrap:wrap; gap:10px; margin-top:-3px; }
.sb-pw-hint{ display:flex; align-items:center; gap:4px; font-size:11px; font-weight:600; color:var(--ink-faint); }
.sb-pw-hint.is-met{ color:var(--bridge-deep); }
.sb-pw-dot{ width:10px; height:10px; border-radius:50%; border:1.5px solid var(--border); flex-shrink:0; }
.sb-role-pick{ margin-top:2px; }
.sb-role-label{ font-size:12.5px; font-weight:600; color:var(--ink-soft); display:block; margin-bottom:7px; }
.sb-role-options{ display:flex; gap:8px; }
.sb-role-opt{ flex:1; display:flex; align-items:center; justify-content:center; gap:6px; border:1.5px solid var(--border); background:#fff; border-radius:var(--radius-md); padding:10px 8px; font-size:12.5px; font-weight:600; color:var(--ink-soft); cursor:pointer; transition:all .18s ease; }
.sb-role-opt.is-active{ border-color:var(--signal); color:var(--signal-deep); background:var(--signal-soft); }

.sb-guest-btn{ margin:14px auto 0; background:none; border:none; color:var(--bridge-deep); font-weight:600; font-size:13px; cursor:pointer; text-decoration:underline; text-underline-offset:3px; }
.sb-auth-error{ background:var(--amber-soft); color:#A9720C; font-size:12.5px; font-weight:600; padding:10px 12px; border-radius:var(--radius-sm); margin:0; }
.sb-forgot-link{ background:none; border:none; color:var(--bridge-deep); font-size:12px; font-weight:600; cursor:pointer; align-self:flex-end; margin-top:-4px; padding:0; }
.sb-forgot-sent{ display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; color:var(--bridge-deep); background:var(--bridge-soft); border-radius:var(--radius-lg); padding:20px 16px; font-size:13px; line-height:1.5; }
.sb-btn:disabled{ opacity:0.6; cursor:not-allowed; }
.sb-trust{ margin-top:auto; padding-top:20px; display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--ink-faint); line-height:1.4; }

/* Dashboard */
.sb-dash-greet{ margin-bottom:16px; }
.sb-dash-eyebrow{ font-size:12.5px; font-weight:600; color:var(--signal-deep); margin:0 0 4px; }
.sb-dash-title{ font-family:'Space Grotesk',sans-serif; font-size:21px; font-weight:700; margin:0; letter-spacing:-0.01em; }

.sb-status-row{ display:flex; gap:8px; margin-bottom:18px; }
.sb-status-chip{ display:inline-flex; align-items:center; gap:5px; background:var(--bridge-soft); color:var(--bridge-deep); font-size:11.5px; font-weight:700; padding:6px 10px; border-radius:999px; }

.sb-cards{ display:flex; flex-direction:column; gap:12px; }
.sb-card{
  display:flex; align-items:center; gap:13px; text-align:left;
  border:1.5px solid var(--border); background:#fff; border-radius:var(--radius-lg);
  padding:16px; cursor:pointer; transition:all .18s ease;
}
.sb-card:hover{ transform:translateY(-2px); box-shadow:var(--shadow-md); }
.sb-card-icon{ width:44px; height:44px; border-radius:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sb-tint-signal .sb-card-icon{ background:var(--signal-soft); color:var(--signal-deep); }
.sb-tint-bridge .sb-card-icon{ background:var(--bridge-soft); color:var(--bridge-deep); }
.sb-tint-amber .sb-card-icon{ background:var(--amber-soft); color:#A9720C; }
.sb-card-body h3{ margin:0 0 3px; font-size:15px; font-weight:700; font-family:'Space Grotesk',sans-serif; }
.sb-card-body p{ margin:0; font-size:12.5px; color:var(--ink-soft); line-height:1.4; }
.sb-card-arrow{ color:var(--ink-faint); flex-shrink:0; }

.sb-admin-link{ margin-top:20px; display:flex; align-items:center; justify-content:center; gap:6px; background:none; border:1.5px dashed var(--border); border-radius:var(--radius-md); padding:11px; font-size:12.5px; font-weight:600; color:var(--ink-soft); cursor:pointer; }

/* Module screens shared */
.sb-module-head{ display:flex; align-items:center; gap:9px; margin-bottom:16px; }
.sb-module-head h2{ display:flex; align-items:center; gap:8px; font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:700; margin:0; flex:1; }
.sb-demo-badge{ font-size:10px; font-weight:700; color:var(--ink-faint); background:var(--paper); padding:4px 9px; border-radius:999px; letter-spacing:.02em; }
.sb-back-inline{ background:var(--paper); border:none; width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--ink); flex-shrink:0; }
.sb-hint{ font-size:11.5px; color:var(--ink-faint); line-height:1.5; margin-top:14px; }

/* Camera */
.sb-camera-wrap{ position:relative; border-radius:var(--radius-lg); overflow:hidden; background:var(--ink); aspect-ratio:4/3; margin-bottom:14px; }
.sb-camera-video{ width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
.sb-camera-canvas{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:scaleX(-1); pointer-events:none; }
.sb-sentence-ur{ font-family:'Noto Nastaliq Urdu',serif; font-size:22px; line-height:2; color:var(--ink); margin:12px 0 0; }
.sb-sentence-actions{ display:flex; gap:8px; margin-top:10px; }
.sb-hint{ font-size:11.5px; color:var(--ink-faint); margin:14px 0 0; line-height:1.5; }
.sb-t2s-stage{ margin:14px 0 10px; }
.sb-t2s-video{ width:100%; max-height:320px; border-radius:16px; background:#0F1528; object-fit:contain; }
.sb-t2s-list{ margin-top:18px; }
.sb-sign-player{ display:flex; flex-direction:column; gap:8px; margin-top:8px; width:220px; max-width:100%; }
.sb-admin-add{ display:flex; gap:6px; margin:10px 0; }
.sb-admin-add input{ flex:1; min-width:0; }
.sb-admin-list{ display:flex; flex-direction:column; gap:6px; margin-top:8px; }
.sb-admin-row{ display:flex; justify-content:space-between; align-items:center; gap:8px; padding:9px 12px; background:#F3F5F7; border-radius:12px; font-size:13px; }
.sb-chip-row{ display:flex; gap:6px; margin-top:8px; }
.sb-chip-row .sb-chip.is-active{ background:#FF5A36; }
.sb-admin-addrow select{ flex:1; min-width:0; border:1.5px solid var(--border); border-radius:var(--radius-sm); padding:9px 8px; font-size:13px; outline:none; background:#fff; }
.sb-lang-toggle{ display:flex; gap:4px; background:#E6EAEE; border-radius:999px; padding:3px; }
.sb-lang-toggle button{ border:0; background:transparent; font-size:12px; font-weight:600; padding:5px 12px; border-radius:999px; color:var(--ink-faint); cursor:pointer; }
.sb-lang-toggle button.is-on{ background:#fff; color:var(--ink); box-shadow:0 1px 3px rgba(0,0,0,.08); }
.sb-offline-row{ margin:14px 0 0; font-size:12px; color:var(--ink-faint); text-align:center; }
.sb-camera-fallback{ position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:#7C87A6; }
.sb-camera-fallback p{ font-size:12px; margin:0; max-width:200px; text-align:center; }
.sb-scan-line{ position:absolute; left:6%; right:6%; height:2px; background:linear-gradient(90deg, transparent, var(--signal), transparent); animation:sbScan 2.2s linear infinite; }
@keyframes sbScan{ 0%{ top:12%;} 100%{ top:85%;} }
.sb-cam-toggle{ position:absolute; bottom:12px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:7px; background:rgba(255,255,255,0.95); border:none; border-radius:999px; padding:9px 16px; font-size:12.5px; font-weight:700; cursor:pointer; color:var(--ink); }
.sb-cam-toggle.is-on{ background:var(--signal); color:#fff; }

/* Result card */
.sb-result-card{ border:1.5px solid var(--border); border-radius:var(--radius-lg); padding:16px; margin-bottom:14px; background:#fff; }
.sb-result-card.is-low{ border-color:var(--amber); background:var(--amber-soft); }
.sb-result-words{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:10px; }
.sb-result-en{ font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; }
.sb-result-ur{ font-family:'Noto Nastaliq Urdu',serif; font-size:20px; color:var(--ink-soft); }
.sb-result-empty{ color:var(--ink-faint); font-size:13px; text-align:center; padding:10px 0; margin:0; }
.sb-low-msg{ display:flex; align-items:center; gap:6px; color:#A9720C; font-size:12.5px; font-weight:700; margin:0; }

.sb-confwrap{ display:flex; align-items:center; gap:8px; }
.sb-confbar{ flex:1; height:6px; border-radius:999px; background:var(--paper); overflow:hidden; }
.sb-conffill{ height:100%; border-radius:999px; transition:width .3s ease; }
.sb-confval{ font-size:11.5px; font-weight:700; width:34px; text-align:right; }

.sb-sentence-strip{ margin-top:auto; }
.sb-sentence-label{ font-size:11px; font-weight:700; color:var(--ink-faint); text-transform:uppercase; letter-spacing:.04em; margin:0 0 8px; }
.sb-sentence-chips{ display:flex; flex-wrap:wrap; gap:7px; min-height:32px; }
.sb-sentence-placeholder{ font-size:12px; color:var(--ink-faint); }
.sb-chip{ background:var(--ink); color:#fff; font-size:12.5px; font-weight:600; padding:6px 12px; border-radius:999px; }

/* Text to sign */
.sb-input-row{ display:flex; gap:9px; margin-bottom:16px; align-items:flex-start; }
.sb-textarea{ flex:1; border:1.5px solid var(--border); border-radius:var(--radius-md); padding:11px 13px; font-family:'Inter',sans-serif; font-size:13.5px; resize:none; outline:none; }
.sb-textarea:focus{ border-color:var(--ink); }
.sb-playback{ border:1.5px solid var(--border); border-radius:var(--radius-lg); padding:16px; min-height:140px; display:flex; align-items:center; }
.sb-sign-row{ display:flex; flex-wrap:wrap; gap:10px; width:100%; }
.sb-sign-card{ display:flex; flex-direction:column; align-items:center; gap:7px; background:var(--paper); border-radius:var(--radius-md); padding:12px 10px; min-width:64px; transition:all .2s ease; border:1.5px solid transparent; }
.sb-sign-card.is-active{ background:var(--signal-soft); border-color:var(--signal); transform:translateY(-3px) scale(1.05); }
.sb-signglyph{ width:34px; height:34px; border-radius:10px; background:#fff; display:flex; align-items:center; justify-content:center; color:var(--ink-soft); box-shadow:0 2px 5px rgba(27,35,64,0.08); }
.sb-signglyph.is-active{ color:var(--signal-deep); }
.sb-sign-card-label{ font-size:12px; font-weight:700; }
.sb-sign-card-tag{ font-size:9px; color:var(--ink-faint); font-weight:600; text-transform:uppercase; }

/* Chat */
.sb-chat{ padding-bottom:14px; }
.sb-chat-log{ flex:1; display:flex; flex-direction:column; gap:10px; overflow-y:auto; padding:4px 2px 10px; min-height:220px; }
.sb-bubble-row{ display:flex; }
.sb-bubble-row.left{ justify-content:flex-start; }
.sb-bubble-row.right{ justify-content:flex-end; }
.sb-bubble{ max-width:75%; border-radius:16px; padding:10px 13px; display:flex; flex-direction:column; gap:2px; font-size:13.5px; }
.sb-bubble-deaf{ background:var(--signal-soft); color:var(--signal-deep); border-bottom-left-radius:4px; }
.sb-bubble-hearing{ background:var(--bridge); color:#fff; border-bottom-right-radius:4px; }
.sb-bubble-en{ font-weight:700; }
.sb-bubble-ur{ font-family:'Noto Nastaliq Urdu',serif; font-size:13.5px; opacity:.85; }
.sb-bubble-meta{ display:flex; align-items:center; gap:4px; font-size:10px; opacity:.8; margin-top:2px; }
.sb-chat-controls{ display:flex; justify-content:center; margin:8px 0; }
.sb-chat-input-row{ display:flex; gap:8px; }
.sb-chat-input-row input{ flex:1; border:1.5px solid var(--border); border-radius:999px; padding:11px 16px; font-size:13.5px; outline:none; font-family:'Inter',sans-serif; }
.sb-chat-input-row input:focus{ border-color:var(--ink); }
.sb-send-btn{ width:42px; height:42px; border-radius:50%; background:var(--ink); color:#fff; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }

/* Admin */
.sb-admin-block{ margin-top:14px; }
.sb-admin-addrow{ display:flex; gap:7px; margin-bottom:14px; }
.sb-admin-addrow input{ flex:1; border:1.5px solid var(--border); border-radius:var(--radius-sm); padding:9px 11px; font-size:13px; outline:none; min-width:0; }
.sb-admin-addrow input:focus{ border-color:var(--ink); }
.sb-admin-table{ display:flex; flex-direction:column; gap:6px; }
.sb-admin-row{ display:flex; align-items:center; gap:10px; padding:10px 11px; border-radius:var(--radius-sm); background:var(--paper); }
.sb-admin-row-icon{ width:26px; height:26px; border-radius:8px; background:#fff; display:flex; align-items:center; justify-content:center; color:var(--ink-soft); flex-shrink:0; }
.sb-admin-row-en{ font-weight:700; font-size:13px; flex-shrink:0; }
.sb-admin-row-ur{ font-family:'Noto Nastaliq Urdu',serif; color:var(--ink-soft); font-size:13px; margin-right:auto; }
.sb-admin-user-info{ display:flex; flex-direction:column; margin-right:auto; min-width:0; }
.sb-admin-sub{ font-size:11px; color:var(--ink-faint); }
.sb-role-badge{ font-size:10px; font-weight:700; background:#fff; padding:4px 9px; border-radius:999px; color:var(--ink-soft); flex-shrink:0; }
.sb-status-dot{ width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.sb-status-dot.on{ background:var(--bridge); }
.sb-status-dot.off{ background:var(--ink-faint); }
.sb-icon-btn{ background:none; border:none; color:var(--ink-faint); cursor:pointer; display:flex; padding:4px; flex-shrink:0; }
.sb-icon-btn:hover{ color:var(--signal-deep); }

/* Bottom nav */
.sb-bottomnav{ display:flex; border-top:1px solid var(--border); flex-shrink:0; padding:6px 6px calc(6px + env(safe-area-inset-bottom)); }
.sb-navbtn{ flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; background:none; border:none; padding:8px 4px; cursor:pointer; color:var(--ink-faint); font-size:10px; font-weight:600; border-radius:12px; transition:all .15s ease; }
.sb-navbtn.is-active{ color:var(--signal-deep); background:var(--signal-soft); }

@media (max-width:400px){
  .sb-shell{ border-radius:20px; min-height:100vh; }
  .sb-root{ padding:0; }
}

@media (prefers-reduced-motion: reduce){
  .sb-root *{ animation:none !important; transition:none !important; }
}
`;