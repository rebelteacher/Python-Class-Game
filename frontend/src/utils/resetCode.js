// Shared helper for the "Clear Code" button across every code editor.
// Prompts the user with a confirmation dialog, then resets the editor to the
// problem's starter code (or clears it if there is no starter).

const DEFAULT_FALLBACK = "# Write your code here\n";

/**
 * Reset the editor's code to `starterCode` (or a sensible default) after a
 * confirm dialog. Returns true if the reset happened, false if the user
 * cancelled.
 */
export function resetCodeWithConfirm({ starterCode, setCode, currentCode = "", fallback = DEFAULT_FALLBACK }) {
  const hasStarter = starterCode && String(starterCode).trim() !== "";
  const targetCode = hasStarter ? starterCode : fallback;

  // If the editor is already at the target, no need to do anything.
  if (currentCode === targetCode) {
    return false;
  }

  const message = hasStarter
    ? "Reset your code back to the starter code?\n\nThis will erase your current changes and cannot be undone."
    : "Clear all code in the editor?\n\nThis will erase everything and cannot be undone.";

  if (typeof window !== "undefined" && !window.confirm(message)) {
    return false;
  }

  setCode(targetCode);
  return true;
}
