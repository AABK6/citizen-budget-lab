import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TutorialOverlay } from './TutorialOverlay';

const STORAGE_KEY = 'has_seen_tutorial_v8';

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('TutorialOverlay', () => {
  it('renders the first step when unseen', async () => {
    render(
      <TutorialOverlay onComplete={() => {}} onStepChange={() => {}} />
    );

    expect(await screen.findByText(/Point de/)).toBeInTheDocument();
  });

  it('emits step changes when advancing', async () => {
    const onStepChange = vi.fn();
    render(
      <TutorialOverlay onComplete={() => {}} onStepChange={onStepChange} />
    );

    await screen.findByText(/Point de/);
    onStepChange.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    await waitFor(() => {
      expect(onStepChange).toHaveBeenCalledWith(1);
    });
  });

  it('marks the tutorial as seen on close', async () => {
    const onComplete = vi.fn();
    render(<TutorialOverlay onComplete={onComplete} />);

    await screen.findByText(/Point de/);
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(onComplete).toHaveBeenCalled();
  });

  it('does not crash when localStorage is unavailable', async () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });

    const onComplete = vi.fn();
    render(<TutorialOverlay onComplete={onComplete} />);

    expect(await screen.findByText(/Point de/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    expect(onComplete).toHaveBeenCalled();

    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
