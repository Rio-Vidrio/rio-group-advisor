/**
 * Mobile-friendly image save from an html2canvas Canvas.
 *
 * Desktop → standard anchor-with-download attribute.
 * Mobile with Web Share API + file support (iOS 15+ Safari, modern Android
 *   Chrome) → opens the native share sheet so the user can Save to Photos /
 *   Files / Send.
 * iOS Safari without file-share support → opens the image in a new tab so
 *   the user can long-press and Save Image.
 *
 * This exists because the classic `<a download href="data:...">` +
 * `link.click()` pattern silently fails on mobile Safari, giving the user a
 * spinner but no downloaded file.
 */
export async function saveCanvasAsJpg(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.95));
  if (!blob) return;
  const file = new File([blob], filename, { type: "image/jpeg" });

  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { canShare?: (data: ShareData) => boolean }) : null;
  if (nav && typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename });
      return;
    } catch (err) {
      // User cancelled → done. Any other error → fall through to download path.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    // iOS Safari ignores the download attribute — open the image in a new tab so the user can long-press → Save Image.
    window.open(url, "_blank");
  } else {
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
