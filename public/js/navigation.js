export function initNavigation(scope = document) {
  const header = scope.querySelector?.("[data-site-header]");
  if (!header) return () => {};
  const trigger = header.querySelector("[data-menu-trigger]");
  const menu = header.querySelector("[data-menu]");
  const main = document.querySelector("main");
  const footer = document.querySelector("[data-page-footer]");
  let lastFocus = null;

  const focusable = () => [...menu.querySelectorAll("a[href],button:not([disabled])")];
  const close = () => {
    header.classList.remove("menu-open");
    menu.classList.remove("is-open");
    menu.inert = true;
    if (main) main.inert = false;
    if (footer) footer.inert = false;
    trigger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    (lastFocus || trigger).focus();
  };
  const open = () => {
    lastFocus = document.activeElement;
    header.classList.add("menu-open");
    menu.classList.add("is-open");
    menu.inert = false;
    if (main) main.inert = true;
    if (footer) footer.inert = true;
    trigger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => focusable()[0]?.focus());
  };
  const toggle = () => trigger.getAttribute("aria-expanded") === "true" ? close() : open();
  const keydown = (event) => {
    if (event.key === "Escape" && trigger.getAttribute("aria-expanded") === "true") close();
    if (event.key !== "Tab" || trigger.getAttribute("aria-expanded") !== "true") return;
    const nodes = focusable(), first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  trigger.addEventListener("click", toggle);
  document.addEventListener("keydown", keydown);
  menu.addEventListener("click", (event) => { if (event.target.closest("a")) close(); });
  return () => {
    trigger.removeEventListener("click", toggle);
    document.removeEventListener("keydown", keydown);
    document.body.style.overflow = "";
    if (main) main.inert = false;
    if (footer) footer.inert = false;
  };
}
