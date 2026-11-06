"use client";
import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Play, Expand } from "lucide-react";
import type { MatchMedia } from "@/types/championship";
import { Dialog } from "./ui/dialog";
export function MatchGallery({ media }: { media: MatchMedia[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const current = selected === null ? undefined : media[selected];
  const move = (step: number) =>
    setSelected((i) =>
      i === null ? null : (i + step + media.length) % media.length,
    );
  return (
    <section className="section-space match-gallery">
      <div className="match-section-title">
        <div>
          <span className="eyebrow accent">BEYOND THE SCORE</span>
          <h2>Match moments</h2>
        </div>
        <span className="optional-tag">{media.length} moments</span>
      </div>
      <div className="gallery-grid">
        {media.map((item, i) => (
          <button
            type="button"
            key={item.id}
            className="gallery-item"
            onClick={() => setSelected(i)}
            aria-label={`Open ${item.kind === "video" ? "highlight" : "photo"} ${i + 1}${item.caption ? `: ${item.caption}` : ""}`}
          >
            {item.kind === "image" ? (
              <Image
                src={item.url}
                alt={item.caption || `Match photo ${i + 1}`}
                width={800}
                height={600}
                sizes="(max-width: 600px) 90vw, 360px"
              />
            ) : (
              <>
                <video
                  src={item.url}
                  preload="metadata"
                  muted
                  playsInline
                  aria-hidden="true"
                />
                <span className="gallery-play">
                  <Play size={24} />
                </span>
              </>
            )}
            <span className="gallery-item-footer">
              <span>
                {item.caption ||
                  (item.kind === "video" ? "Watch highlight" : "View photo")}
              </span>
              {item.kind === "video" ? (
                <Play size={15} />
              ) : (
                <Expand size={15} />
              )}
            </span>
          </button>
        ))}
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={current?.caption || "Match moment"}
        description={
          selected === null ? "" : `${selected + 1} of ${media.length}`
        }
        wide
      >
        {current && (
          <div
            className="gallery-lightbox"
            onKeyDown={(e) => {
              if (e.target instanceof HTMLVideoElement) return;
              if (e.key === "ArrowRight") move(1);
              if (e.key === "ArrowLeft") move(-1);
            }}
          >
            {current.kind === "image" ? (
              <Image
                src={current.url}
                alt={current.caption || "Match photo"}
                width={1600}
                height={1200}
                sizes="90vw"
              />
            ) : (
              <video
                key={current.id}
                src={current.url}
                controls
                playsInline
                preload="metadata"
                aria-label={current.caption || "Match highlight"}
              />
            )}
            {media.length > 1 && (
              <div className="gallery-navigation">
                <button
                  type="button"
                  aria-label="Previous moment"
                  onClick={() => move(-1)}
                >
                  <ChevronLeft size={20} /> Previous
                </button>
                <span>
                  {(selected ?? 0) + 1} / {media.length}
                </span>
                <button
                  type="button"
                  aria-label="Next moment"
                  onClick={() => move(1)}
                >
                  Next <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </section>
  );
}
