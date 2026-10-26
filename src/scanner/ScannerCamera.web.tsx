import { useEffect, useImperativeHandle, useRef } from 'react';
import type { Worker } from 'tesseract.js';
import { cropForFrame } from './cropMath';
import { createWebOcr } from './ocr.web';
import type { CameraErrorKind, ScannerCameraProps } from './ScannerCamera.types';

// Web build: the camera through getUserMedia (rear camera preferred) shown in a <video>,
// frames copied to a canvas cropped to the scanning frame, and read in the browser with
// Tesseract. Nothing is uploaded.

// Width of the image handed to Tesseract. Smaller is faster; this keeps print legible.
const OCR_WIDTH = 1000;

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

function describeError(e: unknown): [CameraErrorKind, string] {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return ['denied', 'Camera access is blocked for this site. Allow the camera in your browser settings, then try again.'];
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return ['unavailable', 'No camera was found on this device.'];
  if (name === 'NotReadableError' || name === 'AbortError') {
    return ['other', 'The camera is being used by another app or tab. Close it and try again.'];
  }
  return ['other', 'The camera could not start.'];
}

export function ScannerCamera({ ref, active, torch, onReady, onError }: ScannerCameraProps) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const worker = useRef<Promise<Worker> | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  // Latest callbacks, so starting the camera does not depend on their identity.
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };

  // The OCR engine loads once per scanner visit and is shut down when the scanner closes.
  useEffect(() => {
    return () => {
      worker.current?.then((w) => w.terminate()).catch(() => {});
      worker.current = null;
    };
  }, []);

  // Start the stream while active; stop every track when inactive (tab hidden) or on unmount.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const stop = () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      if (video.current) video.current.srcObject = null;
    };

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        callbacks.current.onError('unsupported', 'This browser cannot use the camera here. Open Prexpire over https in Safari, Chrome or Edge.');
        return;
      }
      // Never two streams at once.
      stop();
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch (e) {
        if (!cancelled) callbacks.current.onError(...describeError(e));
        return;
      }
      if (cancelled) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      const v = video.current;
      if (v) {
        v.srcObject = s;
        await v.play().catch(() => {});
      }

      try {
        worker.current ??= createWebOcr();
        await worker.current;
      } catch {
        worker.current = null;
        if (!cancelled) callbacks.current.onError('ocr', 'The text reader could not load. Check your connection and try again.');
        return;
      }
      if (cancelled) return;
      const caps = (s.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as TorchCapabilities;
      callbacks.current.onReady({ torch: !!caps.torch });
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [active]);

  useEffect(() => {
    const track = stream.current?.getVideoTracks()[0];
    const caps = (track?.getCapabilities?.() ?? {}) as TorchCapabilities;
    if (!track || !caps.torch) return;
    track.applyConstraints({ advanced: [{ torch } as MediaTrackConstraintSet] }).catch(() => {});
  }, [torch, active]);

  useImperativeHandle(ref, () => ({
    readText: async (geometry) => {
      const v = video.current;
      const w = await worker.current;
      if (!v || !w || !v.videoWidth || v.readyState < 2) return [];
      const full = { x: 0, y: 0, width: v.videoWidth, height: v.videoHeight };
      const crop = (geometry && cropForFrame(geometry.view, geometry.frame, { width: v.videoWidth, height: v.videoHeight })) || full;

      const c = (canvas.current ??= document.createElement('canvas'));
      const scale = Math.min(1, OCR_WIDTH / crop.width);
      c.width = Math.round(crop.width * scale);
      c.height = Math.round(crop.height * scale);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return [];
      ctx.drawImage(v, crop.x, crop.y, crop.width, crop.height, 0, 0, c.width, c.height);
      // Grayscale with a little extra contrast helps Tesseract with printed labels.
      const img = ctx.getImageData(0, 0, c.width, c.height);
      const px = img.data;
      for (let i = 0; i < px.length; i += 4) {
        const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const boosted = Math.max(0, Math.min(255, (g - 128) * 1.35 + 128));
        px[i] = px[i + 1] = px[i + 2] = boosted;
      }
      ctx.putImageData(img, 0, 0);

      const { data } = await w.recognize(c);
      return data.text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    },
  }));

  return (
    <video
      ref={video}
      autoPlay
      muted
      playsInline
      aria-label="Camera preview"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }}
    />
  );
}
