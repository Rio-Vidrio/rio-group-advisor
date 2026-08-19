/**
 * Capture a print-only summary element with html2canvas and hand the resulting
 * image to the user in whatever way their browser actually supports.
 *
 * The classic pattern (build a data URL, click a hidden anchor with a
 * `download` attribute) silently drops on iOS Safari — spinner runs, no file.
 * `navigator.share` and `window.open` don't help either because by the time
 * html2canvas finishes rendering, the user-gesture context is stale, so both
 * are blocked as popups.
 *
 * Strategy the app uses now:
 *   1. Try `navigator.share({files})` first when the browser reports support.
 *      This is the best UX — native Save-to-Photos / Files / Share via.
 *   2. Otherwise, show a full-screen preview modal with the JPEG on-screen so
 *      the user can long-press → Save Image (mobile) or right-click → Save
 *      Image As (desktop), or tap the in-modal Download button which runs
 *      inside a live gesture and works everywhere.
 *   3. If anything goes wrong (html2canvas fails, toBlob returns null, etc.)
 *      the user sees an error banner instead of nothing.
 */

import html2canvas from "html2canvas";

let currentModalCleanup: (() => void) | null = null;

function isMobile(): boolean {
  return typeof navigator !== "undefined" && /Mobi|Android|iPad|iPhone|iPod/i.test(navigator.userAgent);
}

function showErrorModal(message: string): void {
  currentModalCleanup?.();
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
  const box = document.createElement("div");
  box.style.cssText = "background:#fff;border-radius:14px;padding:24px;max-width:420px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.35);";
  box.innerHTML = `
    <div style="font-size:44px;line-height:1;margin-bottom:12px;">⚠️</div>
    <div style="font-weight:700;font-size:17px;color:#111;margin-bottom:8px;">Couldn't save image</div>
    <div style="font-size:14px;color:#4B4B4B;line-height:1.5;margin-bottom:20px;">${message}</div>
    <button type="button" id="__saveImg_close" style="padding:10px 24px;background:#C8202A;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">OK</button>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const cleanup = () => { overlay.remove(); currentModalCleanup = null; };
  box.querySelector("#__saveImg_close")?.addEventListener("click", cleanup);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(); });
  currentModalCleanup = cleanup;
}

function showPreviewModal(blob: Blob, filename: string): void {
  currentModalCleanup?.();

  const url = URL.createObjectURL(blob);
  const mobile = isMobile();

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
  instructions.innerHTML = mobile
    ? "<strong>Long-press the image</strong> and choose <strong>Save Image</strong> to add it to Photos, or <strong>Share</strong> to send it."
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

async function deliverBlob(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/jpeg" });
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { canShare?: (data: ShareData) => boolean }) : null;

  if (nav && typeof nav.share === "function" && typeof nav.canShare === "function") {
    let canShare = false;
    try { canShare = nav.canShare({ files: [file] }); } catch { canShare = false; }
    if (canShare) {
      try {
        await nav.share({ files: [file], title: filename });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Any other error → fall through to modal
      }
    }
  }
  showPreviewModal(blob, filename);
}

/** @deprecated — kept for backward compatibility; prefer captureAndSave. */
export async function saveCanvasAsJpg(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  try {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.95));
    if (!blob) throw new Error("The browser couldn't turn the rendered image into a file. Try Save PDF instead.");
    await deliverBlob(blob, filename);
  } catch (err) {
    showErrorModal(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Capture a DOM element with html2canvas and save it as a JPEG.
 * Handles temporarily showing print-only elements, mobile scale tuning, and
 * user-visible error messages.
 */
export async function captureAndSave(el: HTMLElement, filename: string): Promise<void> {
  // Temporarily reveal print-only content — position off-screen but rendered
  const prev = {
    display: el.style.display,
    position: el.style.position,
    left: el.style.left,
    top: el.style.top,
    zIndex: el.style.zIndex,
    opacity: el.style.opacity,
  };
  el.style.display = "block";
  el.style.position = "fixed";
  el.style.left = "0";
  el.style.top = "0";
  el.style.zIndex = "-1";
  el.style.opacity = "0";

  try {
    // Give the browser a paint tick so html2canvas measures real dimensions
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    // Lower scale on mobile — high-DPR + tall summary cards can blow past
    // Safari's canvas memory limit and return an all-white image or fail.
    const scale = isMobile() ? 1.5 : 2;

    const canvas = await html2canvas(el, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    if (!blob) throw new Error("The browser couldn't turn the rendered image into a file. Try Save PDF instead.");
    await deliverBlob(blob, filename);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showErrorModal(`${msg}\n\nIf this keeps happening, use Save PDF and open it in Photos to save the image.`);
  } finally {
    el.style.display = prev.display;
    el.style.position = prev.position;
    el.style.left = prev.left;
    el.style.top = prev.top;
    el.style.zIndex = prev.zIndex;
    el.style.opacity = prev.opacity;
  }
}
