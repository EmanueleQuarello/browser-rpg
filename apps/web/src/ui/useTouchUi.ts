import { useEffect, useState } from "react";

const QUERY = "(pointer: coarse), (hover: none) and (max-width: 820px)";

function readOverride(): boolean | null {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("touch");
  if (q === "1" || q === "true") {
    localStorage.setItem("brpg-touch", "1");
    return true;
  }
  if (q === "0" || q === "false") {
    localStorage.setItem("brpg-touch", "0");
    return false;
  }
  const stored = localStorage.getItem("brpg-touch");
  if (stored === "1") return true;
  if (stored === "0") return false;
  return null;
}

/** Touch UI: coarse pointer / phone, or ?touch=1 / localStorage brpg-touch. */
export function useTouchUi(): boolean {
  const [touch, setTouch] = useState(() => {
    if (typeof window === "undefined") return false;
    const over = readOverride();
    if (over !== null) return over;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const apply = () => {
      const over = readOverride();
      if (over !== null) {
        setTouch(over);
        return;
      }
      setTouch(window.matchMedia(QUERY).matches);
    };
    apply();
    const mq = window.matchMedia(QUERY);
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return touch;
}
