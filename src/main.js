import "./style.css";
import { gallery } from "./data/gallery.js";
import { CHAPTERS, getChapter, getChapterIndex } from "./animation/MasterTimeline.js";
import { Experience } from "./experience/Experience.js";
import { clamp01, smoothstep } from "./utils/math.js";

const elements = {
  app: document.querySelector("#app"),
  canvas: document.querySelector("#experience"),
  loader: document.querySelector(".loader"),
  loadProgress: document.querySelector("[data-load-progress]"),
  progressFill: document.querySelector("[data-progress-fill]"),
  chapterName: document.querySelector("[data-chapter-name]"),
  chapterIndex: document.querySelector("[data-chapter-index]"),
  arrival: document.querySelector(".arrival-copy"),
  scrollCue: document.querySelector(".scroll-cue"),
  final: document.querySelector(".final-invitation"),
  artLabel: document.querySelector(".art-label"),
  artTitle: document.querySelector("[data-art-title]"),
  artMeta: document.querySelector("[data-art-meta]"),
  dialog: document.querySelector("#work-dialog"),
  workList: document.querySelector("[data-work-list]")
};

const padIndex = (index) => String(index + 1).padStart(2, "0");

const makeWorkArchive = () => {
  const fragment = document.createDocumentFragment();

  gallery.forEach((item, index) => {
    const entry = document.createElement("li");
    entry.className = "work-list__item";
    entry.innerHTML = `
      <img src="${item.src}" alt="${item.alt}" width="640" height="440" loading="lazy" />
      <div>
        <span>${padIndex(index)} / ${item.chapter}</span>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <span>${item.credit}</span>
      </div>
      <a class="work-list__credit" href="${item.creditUrl}" target="_blank" rel="noreferrer" aria-label="Photo credit: ${item.credit}">View source</a>
    `;
    fragment.append(entry);
  });

  elements.workList.append(fragment);
};

let dialogOpener = null;

const showDialog = (event) => {
  if (elements.dialog.open) return;
  dialogOpener =
    event?.currentTarget instanceof HTMLElement ? event.currentTarget : document.activeElement;
  elements.dialog.showModal();
  elements.app.inert = true;
  requestAnimationFrame(() => elements.dialog.querySelector("a")?.focus());
};

const closeDialog = () => {
  elements.dialog.close();
  elements.app.inert = false;
  dialogOpener?.focus();
};

document.querySelectorAll("[data-open-work]").forEach((button) => {
  button.addEventListener("click", showDialog);
});
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  showDialog(event);
});
document.querySelector("[data-close-work]").addEventListener("click", closeDialog);
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) closeDialog();
});
elements.dialog.addEventListener("close", () => {
  elements.app.inert = false;
});

makeWorkArchive();

let lastChapter = "";
let lastArtwork = "";
let loaderHidden = false;
let debugPanel = null;

if (new URLSearchParams(window.location.search).get("debug") === "1") {
  document.documentElement.classList.add("is-debug");
  debugPanel = document.createElement("pre");
  debugPanel.className = "debug-panel";
  document.body.append(debugPanel);
}

const updateInterface = (progress, stats = {}) => {
  const chapter = getChapter(progress);
  const chapterIndex = getChapterIndex(progress);
  elements.progressFill.style.transform = `scaleY(${progress})`;

  if (chapter.id !== lastChapter) {
    elements.chapterName.textContent = chapter.label;
    elements.chapterIndex.textContent = padIndex(chapterIndex);
    document.documentElement.dataset.chapter = chapter.id;
    lastChapter = chapter.id;
  }

  const arrivalOut = smoothstep(clamp01(progress / 0.105));
  elements.arrival.style.opacity = String(1 - arrivalOut);
  elements.arrival.style.transform = `translate3d(0, ${arrivalOut * -22}px, 0)`;
  elements.scrollCue.style.opacity = String(1 - smoothstep(clamp01(progress / 0.035)));

  const finalIn = smoothstep(clamp01((progress - 0.918) / 0.064));
  elements.final.style.opacity = String(finalIn);
  elements.final.style.transform = `translate3d(0, ${(1 - finalIn) * 22}px, 0)`;
  elements.final.classList.toggle("is-visible", finalIn > 0.72);

  const activeArtwork = gallery.find(
    (item) => progress >= item.start - 0.015 && progress <= item.end + 0.035
  );
  const artworkId = activeArtwork?.id ?? "";

  if (artworkId !== lastArtwork) {
    elements.artLabel.classList.toggle("is-visible", Boolean(activeArtwork));
    elements.artTitle.textContent = activeArtwork?.title ?? "";
    elements.artMeta.textContent = activeArtwork?.meta ?? "";
    lastArtwork = artworkId;
  }

  if (debugPanel) {
    debugPanel.textContent = [
      `PROGRESS ${(progress * 100).toFixed(2)}%`,
      `CHAPTER ${padIndex(chapterIndex)} ${chapter.label.toUpperCase()}`,
      `ART ${activeArtwork?.id ?? "—"}`,
      `DRAWS ${stats.calls ?? "—"} / TRIANGLES ${stats.triangles ?? "—"}`
    ].join("\n");
  }
};

const experience = new Experience({
  canvas: elements.canvas,
  manifest: gallery,
  onProgress: (progress) => {
    elements.loadProgress.textContent = Math.round(progress * 100);
    if (progress >= 1 && !loaderHidden) {
      loaderHidden = true;
      window.setTimeout(() => {
        elements.loader.classList.add("is-complete");
        window.setTimeout(() => {
          elements.loader.hidden = true;
        }, 500);
      }, 260);
    }
  },
  onUpdate: updateInterface
});

experience.init();
window.addEventListener("pagehide", () => experience.destroy(), { once: true });

// Exposed only for deterministic review and screenshot automation.
window.__GALLERY_HOUSE__ = {
  chapters: CHAPTERS,
  gallery,
  experience
};
