// Shared by the theme switch (client) and the root layout (server). Kept out of
// the "use client" file so the server gets the real string, not a reference.

export const THEME_KEY = "ih-theme";

/** Inline script for <head>: apply a saved choice before the page paints. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
