// Decides when a recognized letter is added to the sentence.
// Rule: a letter is added ONCE per sign. It is added again only after the
// hand has shown a different letter, or the hand has left the frame.
export const CONFIDENCE_MIN = 0.7;
export const HOLD_FRAMES = 15;

export function newCommitState() {
  return { cand: null, hold: 0, committedFor: null, noHand: 0 };
}

// returns the letter name to add now, or null
export function decide(st, name, confidence, hasHand, minConf = CONFIDENCE_MIN, holdN = HOLD_FRAMES) {
  if (!hasHand) {
    st.noHand += 1;
    st.cand = null;
    st.hold = 0;
    if (st.noHand >= 8) st.committedFor = null; // hand really left
    return null;
  }
  st.noHand = 0;
  if (confidence < minConf) {
    st.cand = null;
    st.hold = 0;
    return null;
  }
  if (st.cand === name) st.hold += 1;
  else { st.cand = name; st.hold = 1; }
  // a different letter shown with confidence = a new sign begins
  if (st.committedFor && st.committedFor !== name && st.hold >= 3) st.committedFor = null;
  if (st.hold >= holdN && st.committedFor !== name) {
    st.committedFor = name;
    return name;
  }
  return null;
}