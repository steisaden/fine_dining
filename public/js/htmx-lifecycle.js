const cleanups = new WeakMap();

export function registerCleanup(root, cleanup) {
  const list = cleanups.get(root) || [];
  list.push(cleanup);
  cleanups.set(root, list);
}

export function destroyTree(root) {
  if (!root) return;
  [root, ...root.querySelectorAll("*")].forEach((node) => {
    const list = cleanups.get(node);
    if (!list) return;
    list.splice(0).forEach((cleanup) => cleanup());
    cleanups.delete(node);
  });
}

export function installHTMXLifecycle(initialize) {
  document.addEventListener("htmx:beforeSwap", (event) => destroyTree(event.detail.target));
  document.addEventListener("htmx:beforeCleanupElement", (event) => destroyTree(event.detail.elt));
  document.addEventListener("htmx:afterSwap", (event) => {
    initialize(event.detail.target);
    requestAnimationFrame(() => event.detail.target.querySelector("[data-focus-on-swap]")?.focus());
  });
  document.addEventListener("htmx:historyRestore", () => initialize(document));
}
