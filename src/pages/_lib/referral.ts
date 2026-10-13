const REF_KEY = "cbeast_ref";

// Remember a ?ref= code so it survives the sign-in redirect
export function captureReferral() {
  const code = new URLSearchParams(window.location.search).get("ref");
  if (code) localStorage.setItem(REF_KEY, code);
}

export const readReferral = () => localStorage.getItem(REF_KEY) ?? undefined;
export const clearReferral = () => localStorage.removeItem(REF_KEY);
