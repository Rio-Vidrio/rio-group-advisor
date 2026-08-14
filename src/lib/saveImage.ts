/**
 * Mobile-friendly image save from an html2canvas Canvas.
 *
 * The classic `<a download href="data:...">` + `link.click()` pattern silently
 * fails on iOS Safari. `navigator.share` and `window.open` also fail after
 * html2canvas' async processing because the user-gesture context is lost.
 *
 * Strategy:
 * 1. Try navigator.share({files}) — works on iOS 15+ Safari and modern
 *    Android if invoked quickly enough after the tap.
 * 2. Otherwise show a full-screen preview modal with the image inline.
 *    - Mobile: user long-presses the visible image → native Save Image.
 *    - Desktop: user right-clicks Save Image As, or taps the Download
 *      button which uses a fresh, gesture-live anchor click.
 * This always works regardless of platform quirks — the image is on-screen,
 * user takes it from there.
 */

let currentModalCleanup: (() => void) | null = null;

function showPreviewModal(blob: Blob, filename: string): void {
  currentModalCleanup?.();

  const url = URL.createObjectURL(blob);
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPad|iPhone|iPod/i.test(navigator.userAgent);

  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Save image preview");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:60px 16px 24px;overflow:auto;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close preview");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cssText =
    "position:fixed;top:12px;right:12px;width:40px;height:40px;background:#C8202A;color:#fff;border:none;border-radius:50%;font-size:22px;font-weight:700;cursor:pointer;line-height:1;z-index:100000;box-shadow:0 4px 12px rgba(0,0,0,0.35);";

  const instructions = document.createElement("div");
  instructions.style.cssText =
    "color:#fff;text-align:center;margin-bottom:16px;max-width:520px;font-size:14px;line-height:1.5;padding:0 8px;";
  instructions.innerHTML = isMobile
    ? "<strong>Long-press the image</strong> below and choose <strong>Save Image</strong> to add it to Photos, or <strong>Share</strong> to send it."
    : "<strong>Right-click the image</strong> and choose <strong>Save Image As…</strong> — or tap the Download button below.";

  const img = document.createElement("img");
  img.src = url;
  img.alt = filename;
  img.style.cssText =
    "max-width:100%;max-height:65vh;height:auto;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.55);background:#fff;";

  const downloadBtn = document.createElement("a");
  downloadBtn.href = url;
  downloadBtn.download = filename;
  downloadBtn.rel = "noopener";
  downloadBtn.textContent = "Download";
  downloadBtn.style.cssText =
    "margin-top:20px;padding:12px 24px;background:#fff;color:#111;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.25);";

  overlay.appendChild(closeBtn);
  overlay.appendChild(instructions);
  overlay.appendChild(img);
  overlay.appendChild(downloadBtn);
  document.body.appendChild(overlay);

  // Prevent background page scroll while modal is open
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const cleanup = () => {
    overlay.remove();
    document.body.style.overflow = prevOverflow;
    URL.revokeObjectURL(url);
    document.removeEventListener("keydown", onKey);
    currentModalCleanup = null;
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cleanup(); };

  closeBtn.addEventListener("click", cleanup);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(); });
  document.addEventListener("keydown", onKey);
  currentModalCleanup = cleanup;
}

export async function saveCanvasAsJpg(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.95));
  if (!blob) return;

  // Best UX when it works: native share sheet on iOS/Android
  const file = new File([blob], filename, { type: "image/jpeg" });
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { canShare?: (data: ShareData) => boolean }) : null;
  if (nav && typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Fall through to modal
    }
  }

  // Universal fallback — works everywhere because the image is on-screen
  showPreviewModal(blob, filename);
}
