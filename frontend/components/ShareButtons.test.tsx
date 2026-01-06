import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ShareButtons } from './ShareButtons';

describe('ShareButtons', () => {
  it('builds the share links from the provided url', () => {
    const shareUrl = 'https://example.com/build?scenarioId=abc';
    const message = 'Test message';
    render(<ShareButtons shareUrl={shareUrl} message={message} onCopy={vi.fn()} />);

    const xLink = screen.getByRole('link', { name: /Partager sur X/i });
    const linkedinLink = screen.getByRole('link', { name: /LinkedIn/i });
    const whatsappLink = screen.getByRole('link', { name: /WhatsApp/i });

    expect(xLink).toHaveAttribute(
      'href',
      `https://x.com/intent/tweet?text=${encodeURIComponent(`${message} ${shareUrl}`)}`,
    );
    expect(linkedinLink).toHaveAttribute(
      'href',
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    );
    expect(whatsappLink).toHaveAttribute(
      'href',
      `https://wa.me/?text=${encodeURIComponent(`${message} ${shareUrl}`)}`,
    );
  });

  it('disables buttons when url is missing', () => {
    render(<ShareButtons shareUrl={null} message="x" onCopy={vi.fn()} />);

    const copyButton = screen.getByRole('button', { name: /Copier le lien/i });
    expect(copyButton).toBeDisabled();
  });
});
