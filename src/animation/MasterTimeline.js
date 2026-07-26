export const CHAPTERS = [
  { id: "arrival", label: "Arrival", start: 0, end: 0.08 },
  { id: "gallery", label: "First Gallery", start: 0.08, end: 0.2 },
  { id: "turn", label: "Right Turn", start: 0.2, end: 0.3 },
  { id: "corridor", label: "Compression", start: 0.3, end: 0.43 },
  { id: "floating", label: "Floating Chamber", start: 0.43, end: 0.58 },
  { id: "curve", label: "Curved Turn", start: 0.58, end: 0.68 },
  { id: "light-well", label: "Light Well", start: 0.68, end: 0.8 },
  { id: "assembly", label: "Assembly", start: 0.8, end: 0.91 },
  { id: "salon", label: "Final Salon", start: 0.91, end: 1 }
];

export const getChapter = (progress) =>
  CHAPTERS.find((chapter) => progress >= chapter.start && progress <= chapter.end) ??
  CHAPTERS.at(-1);

export const getChapterIndex = (progress) =>
  Math.max(
    0,
    CHAPTERS.findIndex((chapter) => progress >= chapter.start && progress <= chapter.end)
  );
