import { useEffect, useRef, useState } from "react";

// Debounced auto-save that won't lose your last edit if you switch tabs
// right after typing. A plain setTimeout debounce cancels its pending save
// when the page component unmounts - and App only ever renders the ACTIVE
// tab, so switching tabs unmounts whatever you were just editing. If the
// debounce hadn't fired yet, that edit was silently dropped, forever.
//
// This still debounces normally, but if you navigate away before the timer
// fires, it saves immediately instead of cancelling.
//
// value:   whatever should be saved once things settle (an object/array is
//          fine - just make sure its reference only changes when the real
//          content changes, e.g. wrap it in useMemo if you're building a
//          fresh object each render).
// save:    async (value) => truthy if it worked. Can do more than one
//          storage.set() call if needed.
// options.delay:        debounce delay in ms (default 350)
// options.ready:        don't save until this is true (e.g. after initial load)
// options.skipInitial:  skip the save that would otherwise immediately follow
//                        `ready` turning true (default true) - there's nothing
//                        to save right after loading, it'd just be a no-op write.
//
// Returns { saveError } - true if the most recent save attempt failed.
export function useAutoSave(value, save, { delay = 350, ready = true, skipInitial = true } = {}) {
  const [saveError, setSaveError] = useState(false);
  const timerRef = useRef(null);
  const pendingFlushRef = useRef(null); // the bound save-closure waiting to fire, or null
  const wasReadyRef = useRef(false);
  const skipNextRef = useRef(false);

  useEffect(() => {
    if (!ready) {
      wasReadyRef.current = false;
      return;
    }
    if (!wasReadyRef.current) {
      wasReadyRef.current = true;
      if (skipInitial) skipNextRef.current = true;
    }
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }

    let done = false;
    const doSave = async () => {
      if (done) return;
      done = true;
      pendingFlushRef.current = null;
      try {
        const result = await save(value);
        setSaveError(!result);
      } catch (e) {
        setSaveError(true);
      }
    };

    pendingFlushRef.current = doSave;
    timerRef.current = setTimeout(doSave, delay);

    // Only cancels the timer - does NOT flush here, or every keystroke
    // (which re-runs this effect) would fire a save instead of debouncing.
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ready, delay]);

  // Separate effect with an empty dependency array, so this cleanup runs
  // ONLY when the component actually unmounts (e.g. switching tabs) - not
  // on every value change. That's the moment we flush instead of drop.
  useEffect(() => {
    return () => {
      if (pendingFlushRef.current) pendingFlushRef.current();
    };
  }, []);

  return { saveError };
}
