import { ScrollVideo } from "./scroll-video.js";
import { initNavigation } from "./navigation.js";
import { installHTMXLifecycle, registerCleanup } from "./htmx-lifecycle.js";

function init(scope = document) {
  if (scope === document || scope.querySelector?.("[data-site-header]")) {
    const header = document.querySelector("[data-site-header]");
    if (header && !header.dataset.ready) {
      header.dataset.ready = "true";
      registerCleanup(header, initNavigation(document));
    }
  }
  scope.querySelectorAll?.("[data-scroll-video-root]:not([data-ready])").forEach((root) => {
    root.dataset.ready = "true";
    const controller = new ScrollVideo(root);
    registerCleanup(root, () => controller.destroy());
  });
  scope.querySelectorAll?.(".course-button,.service-button").forEach((button) => {
    if (button.dataset.selectReady) return;
    button.dataset.selectReady = "true";
    const select = () => {
      button.closest("ol, .private-services__index")?.querySelectorAll(".course-button,.service-button").forEach((peer) => {
        peer.classList.toggle("is-selected", peer === button);
        if (peer === button) peer.setAttribute("aria-current", "true");
        else peer.removeAttribute("aria-current");
      });
    };
    button.addEventListener("click", select);
    registerCleanup(button, () => button.removeEventListener("click", select));
  });
  scope.querySelectorAll?.("[data-copy-prompt]:not([data-ready])").forEach((button) => {
    button.dataset.ready = "true";
    const copy = async () => {
      const text = document.querySelector("#prompt-source")?.textContent || "";
      const status = document.querySelector("[data-copy-status]");
      try { await navigator.clipboard.writeText(text); status.textContent = "Prompt copied to clipboard."; }
      catch { status.textContent = "Copy was blocked. Select the prompt text and copy it manually."; }
    };
    button.addEventListener("click", copy);
    registerCleanup(button, () => button.removeEventListener("click", copy));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  init(document);
  installHTMXLifecycle(init);
});

document.addEventListener("htmx:responseError", (event) => {
  const indicator = event.detail.elt?.closest("section")?.querySelector("[aria-live]");
  if (indicator) indicator.textContent = "The requested detail could not be loaded. Follow the selected link to try again.";
});
