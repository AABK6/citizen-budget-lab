import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { SourceManager, TrajectoryEditor, simpleDiff } from './PolicyCatalogAdminClient';

describe('Admin Rich Editor Components', () => {
  describe('simpleDiff', () => {
    it('identifies additions and removals correctly', () => {
      const oldText = 'line1\nline2';
      const newText = 'line1\nline3';
      const diff = simpleDiff(oldText, newText);
      
      expect(diff).toEqual([
        { type: 'same', text: 'line1' },
        { type: 'remove', text: 'line2' },
        { type: 'add', text: 'line3' }
      ]);
    });

    it('handles additions at the end', () => {
      const oldText = 'a';
      const newText = 'a\nb';
      const diff = simpleDiff(oldText, newText);
      expect(diff).toEqual([
        { type: 'same', text: 'a' },
        { type: 'add', text: 'b' }
      ]);
    });
  });

  describe('SourceManager', () => {
    it('allows adding and removing sources', () => {
      const onChange = vi.fn();
      const initialSources = ['source1'];
      render(<SourceManager sources={initialSources} onChange={onChange} />);

      // Add source
      const addButton = screen.getByText(/Ajouter/i);
      fireEvent.click(addButton);
      expect(onChange).toHaveBeenCalledWith(['source1', '']);

      // Remove source (first one)
      const removeButtons = screen.getAllByRole('button');
      // The first button is "Add", subsequent are "Trash"
      fireEvent.click(removeButtons[1]); 
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('displays external link icon for URLs', () => {
      const initialSources = ['https://example.com'];
      render(<SourceManager sources={initialSources} onChange={vi.fn()} />);
      
      // Should find the link
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('TrajectoryEditor', () => {
    it('displays values in billions and handles updates', () => {
      const onChange = vi.fn();
      const fixed = 2_000_000_000; // 2Md
      const schedule = [2e9, 3e9, 4e9, 5e9, 6e9];
      
      render(<TrajectoryEditor fixed={fixed} schedule={schedule} onChange={onChange} />);

      // Find input for 2027 (second one)
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[1]).toHaveValue(3); // Should show 3 (billions)

      // Update 2027 value to 3.5Md
      fireEvent.change(inputs[1], { target: { value: '3.5' } });
      
      // Expected: the full value in euros
      const expected = [...schedule];
      expected[1] = 3_500_000_000;
      expect(onChange).toHaveBeenCalledWith(expected);
    });
  });
});
