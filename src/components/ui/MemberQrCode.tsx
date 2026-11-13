import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download } from 'lucide-react';
import { memberPortalUrl } from '@/lib/memberPortal';

interface MemberQrCodeProps {
  memberName: string;
  token: string;
}

export function MemberQrCode({ memberName, token }: MemberQrCodeProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const portalUrl = memberPortalUrl(token);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    QRCode.toDataURL(portalUrl, { width: 240, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [portalUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const fileName = `${memberName.trim().replace(/\s+/g, '-').toLowerCase()}-checkin-qr.png`;

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex h-[136px] w-[136px] shrink-0 items-center justify-center rounded-lg bg-white">
        {src ? (
          <img src={src} alt={`Check-in QR code for ${memberName}`} className="h-[136px] w-[136px] transition duration-300" />
        ) : (
          <span className="text-xs text-slate-400">{failed ? 'QR unavailable' : 'Generating...'}</span>
        )}
      </div>
      <div className="min-w-0 text-center sm:text-left">
        <p className="text-sm font-medium text-slate-900">Check-in code</p>
        <p className="mt-1 text-xs text-slate-500">
          Scan at the front desk to check in. Members who scan it see their own membership page.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          {src && (
            <a
              href={src}
              download={fileName}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download QR
            </a>
          )}
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Link copied' : 'Copy member link'}
          </button>
        </div>
      </div>
    </div>
  );
}
