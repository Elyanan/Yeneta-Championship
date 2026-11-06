"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { Upload, X, Film } from "lucide-react";
import type { MatchMedia } from "@/types/championship";
import { mediaFileError, uploadMedia } from "@/lib/media-upload";
export function MatchMediaEditor({
  value,
  onChange,
  onBusyChange,
}: {
  value: MatchMedia[];
  onChange: (value: MatchMedia[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="match-media-editor">
      <div className="match-section-title">
        <div>
          <span className="eyebrow accent">RELIVE THE MOMENT</span>
          <h3>Photos & highlights</h3>
        </div>
        <span className="optional-tag">Optional</span>
      </div>
      <p className="inline-help">
        Add up to 20 photos or clips. Images: 8 MB each. MP4 / WebM videos: 50
        MB each. Save the match to publish your gallery.
      </p>
      <input
        ref={input}
        className="sr-only"
        type="file"
        tabIndex={-1}
        accept="image/png,image/jpeg,image/webp,image/avif,video/mp4,video/webm"
        multiple
        aria-label="Upload match photos or videos"
        disabled={busy || value.length >= 20}
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          setError("");
          const invalid = files
            .map((file) => {
              const message = mediaFileError(file, true);
              return message ? `${file.name}: ${message}` : "";
            })
            .find(Boolean);
          if (invalid) {
            setError(invalid);
            e.target.value = "";
            return;
          }
          if (value.length + files.length > 20) {
            setError("Each match can have up to 20 photos and clips.");
            e.target.value = "";
            return;
          }
          setBusy(true);
          onBusyChange(true);
          const next = [...value];
          try {
            for (const [index, file] of files.entries()) {
              setProgress(`Uploading ${index + 1} of ${files.length}…`);
              const result = await uploadMedia(file, true, (percent) =>
                setProgress(
                  `Uploading ${index + 1} of ${files.length}… ${percent}%`,
                ),
              );
              next.push({
                id: crypto.randomUUID(),
                kind: result.kind,
                url: result.url,
                caption: "",
              });
              onChange([...next]);
            }
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not upload media.",
            );
          } finally {
            setBusy(false);
            onBusyChange(false);
            setProgress("");
            if (input.current) input.current.value = "";
          }
        }}
      />
      <button
        className="media-upload-zone"
        type="button"
        disabled={busy || value.length >= 20}
        onClick={() => input.current?.click()}
      >
        <span>
          <Upload size={23} />
        </span>
        <b>{busy ? progress : "Upload match moments"}</b>
        <small>
          {busy
            ? "Keep this form open while your files upload."
            : "Choose photos or highlight clips from your device"}
        </small>
      </button>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {value.length > 0 && (
        <div className="match-media-grid">
          {value.map((item, index) => (
            <div className="match-media-tile" key={item.id}>
              <div className="media-tile-preview">
                {item.kind === "image" ? (
                  <Image
                    src={item.url}
                    alt={item.caption || `Match photo ${index + 1}`}
                    width={480}
                    height={320}
                    sizes="(max-width: 600px) 90vw, 320px"
                  />
                ) : (
                  <video
                    controls
                    preload="metadata"
                    playsInline
                    src={item.url}
                    aria-label={item.caption || `Highlight ${index + 1}`}
                  />
                )}
                <span>
                  {item.kind === "video" ? <Film size={13} /> : "PHOTO"}
                </span>
              </div>
              <label className="field">
                Caption
                <input
                  value={item.caption}
                  disabled={busy}
                  maxLength={200}
                  placeholder="Add a caption…"
                  onChange={(e) =>
                    onChange(
                      value.map((v) =>
                        v.id === item.id
                          ? { ...v, caption: e.target.value }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <button
                className="text-link"
                type="button"
                disabled={busy}
                onClick={() => onChange(value.filter((v) => v.id !== item.id))}
              >
                <X size={13} /> Remove from match
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
