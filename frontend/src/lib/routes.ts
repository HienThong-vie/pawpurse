// Route groups shared between Layout and page-level components.

// Routes where the floating SleepingMascot widget is hidden. Layout reads this to
// skip the extra bottom padding it adds elsewhere so content can scroll clear of it.
export const MASCOT_HIDDEN_ROUTES = ["/advisor", "/companion"];

// Routes that render their own mobile/tablet top bar (including the burger
// trigger) — Layout must NOT render the fallback mobile header for these, or
// the page will have a duplicated header row on small screens.
export const ROUTES_WITH_OWN_MOBILE_HEADER = ["/advisor"];
