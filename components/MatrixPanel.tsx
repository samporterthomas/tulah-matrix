"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

interface MatrixPanelProps {
  embedUrl: string;
  directUrl: string;
  isOpen: boolean;
  onToggle: () => void;
  height: number;
  onHeightChange: (h: number) => void;
}

const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const DEFAULT_ZOOM = 0.6;

export default function MatrixPanel({
  embedUrl,
  directUrl,
  isOpen,
  onToggle,
  height,
  onHeightChange,
}: MatrixPanelProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // ── Drag-to-resize ─────────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startHeight: height };
      const onMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = ev.clientY - dragRef.current.startY;
        const next = Math.max(200, Math.min(900, dragRef.current.startHeight + delta));
        onHeightChange(next);
      };
      const onMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [height, onHeightChange]
  );

  useEffect(() => {
    if (!isOpen) {
      setLoaded(false);
      setError(false);
    }
  }, [isOpen]);

  const hasEmbed = embedUrl && embedUrl !== "YOUR_PUBLISHED_EMBED_URL_HERE";

  const zoomIn = () =>
    setZoom((z) => {
      const idx = ZOOM_LEVELS.indexOf(z);
      return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : z;
    });
  const zoomOut = () =>
    setZoom((z) => {
      const idx = ZOOM_LEVELS.indexOf(z);
      return idx > 0 ? ZOOM_LEVELS[idx - 1] : z;
    });
  const resetZoom = () => setZoom(DEFAULT_ZOOM);

  // The iframe is scaled down via CSS transform. To avoid clipping, we:
  // - make the iframe itself larger than the container (1/zoom * 100%)
  // - apply transform-origin: top left
  // - scale it back down with transform: scale(zoom)
  const iframeScale = zoom;
  const iframeSizePercent = (1 / zoom) * 100;

  return (
    <div
      className={`flex-shrink-0 flex flex-col border-b border-stone-200 bg-white overflow-hidden transition-all duration-300`}
      style={isOpen ? { height } : { height: 0 }}
    >
      {isOpen && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100 bg-stone-50 flex-shrink-0">
            {/* Left: label */}
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m2.25-2.25h7.5c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-9.75 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h9.75" />
              </svg>
              <span className="text-[11px] font-medium text-stone-600">Benchmark Matrix</span>
              {loaded && !error && <span className="text-[10px] text-stone-400">Google Sheets</span>}
            </div>

            {/* Centre: zoom controls */}
            {hasEmbed && (
              <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-md px-1 py-0.5">
                <button
                  onClick={zoomOut}
                  disabled={zoom === ZOOM_LEVELS[0]}
                  className="w-6 h-6 flex items-center justify-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="Zoom out"
                >
                  −
                </button>
                <button
                  onClick={resetZoom}
                  className="px-1.5 h-6 flex items-center text-[11px] text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded transition-colors tabular-nums min-w-[3rem] justify-center"
                  title="Reset zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={zoomIn}
                  disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  className="w-6 h-6 flex items-center justify-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  title="Zoom in"
                >
                  +
                </button>
              </div>
            )}

            {/* Right: open + collapse */}
            <div className="flex items-center gap-2">
              <a
                href={directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-700 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
                title="Open in Google Sheets"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open in Sheets
              </a>
              <button
                onClick={onToggle}
                className="p-1 rounded-md hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
                title="Collapse matrix"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* iframe area */}
          <div className="flex-1 relative overflow-hidden">
            {!hasEmbed ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <p className="text-sm font-medium text-stone-600 mb-1">Embed URL not configured</p>
                <p className="text-xs text-stone-400 leading-relaxed max-w-xs">
                  Add <code className="bg-stone-100 px-1 rounded text-[11px]">NEXT_PUBLIC_SHEETS_EMBED_URL</code> to your environment variables to enable the inline view.
                </p>
                <a href={directUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-2 rounded-lg transition-colors">
                  Open in Google Sheets ↗
                </a>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <p className="text-sm font-medium text-stone-600">Could not load the embedded sheet</p>
                <p className="text-xs text-stone-400 leading-relaxed max-w-xs">
                  This usually means the sheet hasn&apos;t been published to the web yet.
                </p>
                <a href={directUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-2 rounded-lg transition-colors">
                  Open in Google Sheets ↗
                </a>
              </div>
            ) : (
              <>
                {!loaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <p className="text-xs text-stone-400">Loading spreadsheet…</p>
                  </div>
                )}
                {/* Zoom wrapper: scale the iframe via CSS transform */}
                <div
                  style={{
                    width: `${iframeSizePercent}%`,
                    height: `${iframeSizePercent}%`,
                    transform: `scale(${iframeScale})`,
                    transformOrigin: "top left",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  <iframe
                    src={embedUrl}
                    style={{ width: "100%", height: "100%", border: "none" }}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                    title="Benchmark Matrix"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              </>
            )}
          </div>

          {/* Drag-to-resize handle */}
          <div
            onMouseDown={onMouseDown}
            className="flex-shrink-0 h-2 flex items-center justify-center cursor-row-resize group bg-stone-50 border-t border-stone-100 hover:bg-stone-100 transition-colors"
            title="Drag to resize"
          >
            <div className="w-8 h-0.5 rounded-full bg-stone-300 group-hover:bg-stone-400 transition-colors" />
          </div>
        </>
      )}
    </div>
  );
}
