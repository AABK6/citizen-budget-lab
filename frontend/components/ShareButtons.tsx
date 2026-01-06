import React from 'react';

interface ShareButtonsProps {
  shareUrl: string | null;
  message: string;
  onCopy: () => void;
  className?: string;
}

export function ShareButtons({ shareUrl, message, onCopy, className }: ShareButtonsProps) {
  const shareDisabled = !shareUrl;
  const payload = shareUrl ? `${message} ${shareUrl}` : message;
  const encodedPayload = encodeURIComponent(payload);
  const encodedUrl = shareUrl ? encodeURIComponent(shareUrl) : '';
  const encodedMessage = encodeURIComponent(message);

  const shareClasses = `px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
    shareDisabled
      ? 'border-slate-200 text-slate-400 bg-slate-100 pointer-events-none'
      : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
  }`;

  const copyClasses = `px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
    shareDisabled
      ? 'border-slate-200 text-slate-400 bg-slate-100'
      : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'
  }`;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={shareUrl ? `https://x.com/intent/tweet?text=${encodedPayload}` : '#'}
          target="_blank"
          rel="noreferrer"
          className={shareClasses}
          aria-disabled={shareDisabled}
        >
          Partager sur X
        </a>
        <a
          href={
            shareUrl
              ? `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedMessage}&summary=${encodedMessage}`
              : '#'
          }
          target="_blank"
          rel="noreferrer"
          className={shareClasses}
          aria-disabled={shareDisabled}
        >
          LinkedIn
        </a>
        <a
          href={shareUrl ? `https://wa.me/?text=${encodedPayload}` : '#'}
          target="_blank"
          rel="noreferrer"
          className={shareClasses}
          aria-disabled={shareDisabled}
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={onCopy}
          className={copyClasses}
          disabled={shareDisabled}
        >
          Copier le lien
        </button>
      </div>
    </div>
  );
}
