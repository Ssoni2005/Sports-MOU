const selector = document.getElementById("theme-select");
const root = document.documentElement;
const key = "flame-sports-mou-theme";
const themes = new Set(Array.from(selector.options, option => option.value));
const fallback = selector.options[0].value;

function apply(theme) {
  const value = themes.has(theme) ? theme : fallback;
  root.dataset.theme = value;
  selector.value = value;
}

try {
  apply(localStorage.getItem(key));
} catch {
  apply(fallback);
}

selector.addEventListener("change", () => {
  apply(selector.value);
  try {
    localStorage.setItem(key, selector.value);
  } catch {
    // The selected theme still applies for the current visit.
  }
});
