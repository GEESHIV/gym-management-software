import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CameraOff, Loader2 } from 'lucide-react';

interface QrScannerProps {
  onDetected: (value: string) => void;
}

const MAX_SCAN_WIDTH = 640;

type ScannerState = { status: 'starting' } | { status: 'scanning' } | { status: 'error'; message: string };

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access is blocked. Allow camera access in your browser settings, or type the code below.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device. Type the code below instead.';
  }
  return 'The camera could not be opened. Type the code below instead.';
}

export function QrScanner({ onDetected }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [state, setState] = useState<ScannerState>({ status: 'starting' });

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!video || !canvas || !ctx) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ status: 'error', message: 'This browser cannot open the camera. Type the code below instead.' });
      return;
    }

    let stream: MediaStream | null = null;
    let frameId = 0;
    let finished = false;

    const stop = () => {
      finished = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };

    const scanFrame = () => {
      if (finished) return;
      if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const scale = Math.min(1, MAX_SCAN_WIDTH / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          stop();
          onDetectedRef.current(code.data);
          return;
        }
      }
      frameId = requestAnimationFrame(scanFrame);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (media) => {
        if (finished) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        video.srcObject = media;
        await video.play();
        if (finished) return;
        setState({ status: 'scanning' });
        frameId = requestAnimationFrame(scanFrame);
      })
      .catch((err: unknown) => {
        if (finished) return;
        finished = true;
        stream?.getTracks().forEach((track) => track.stop());
        setState({ status: 'error', message: cameraErrorMessage(err) });
      });

    return stop;
  }, []);

  const failed = state.status === 'error';

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {state.status === 'scanning' && (
        <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
          <span className="absolute inset-x-4 top-1/2 h-0.5 animate-pulse rounded-full bg-emerald-400" />
        </div>
      )}

      {state.status === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting camera...
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-200">
          <CameraOff className="h-6 w-6 text-slate-400" />
          <p>{state.message}</p>
        </div>
      )}
    </div>
  );
}
