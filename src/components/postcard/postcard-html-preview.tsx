"use client";

import { useEffect, useRef, useState } from "react";
import { postcardFrontHtml, postcardBackHtml } from "@/lib/postcard/render-html";
import type { Design, Profile } from "@/lib/types";

// True print size at 96dpi: 6.25in x 4.25in.
const W = 600;
const H = 408;

/**
 * WYSIWYG postcard preview — renders the SAME HTML that Lob prints, scaled to
 * fit its container in a non-interactive iframe. What you see is what mails.
 */
export function PostcardHtmlPreview({
  design,
  profile,
  side = "front",
  className = "",
}: {
  design: Design;
  profile?: Profile | null;
  side?: "front" | "back";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Only mount the iframe once near the viewport (keeps big galleries fast).
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const html =
    !visible
      ? null
      : side === "front"
      ? postcardFrontHtml(design)
      : profile
      ? postcardBackHtml(design, profile)
      : null;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${W} / ${H}`,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <iframe
        title="Postcard preview"
        srcDoc={html ?? ""}
        scrolling="no"
        tabIndex={-1}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          height: H,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
