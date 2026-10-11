import { useEffect, useState } from "react";

/**
 * Mount/unmount timing for a modal with an enter/exit CSS transition.
 *
 * `rendered` stays true for `exitMs` after `open` turns false so the exit
 * transition can play; `visible` flips on two frames after mount so the enter
 * transition starts from the hidden state.
 */
export function useModalTransition(open: boolean, exitMs = 250) {
  const [rendered, setRendered] = useState(open);
  const [entered, setEntered] = useState(false);

  // Adjust state during render (not in an effect) when `open` changes.
  if (open && !rendered) setRendered(true);
  if (!open && entered) setEntered(false);

  useEffect(() => {
    if (open) {
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    const timer = setTimeout(() => setRendered(false), exitMs);
    return () => clearTimeout(timer);
  }, [open, exitMs]);

  return { rendered, visible: entered };
}
