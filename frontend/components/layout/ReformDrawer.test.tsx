import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReformDrawer } from './ReformDrawer';
import { PolicyLever } from '@/app/build/types';

describe('ReformDrawer', () => {
    const mockLever: PolicyLever = {
        id: 'test-lever',
        label: 'Test Reform',
        description: 'A test description',
        family: 'TAXES',
        fixedImpactEur: 1000000,
        pushbacks: [
            {
                type: 'Social',
                description: 'This is a risky reform.',
                source: 'http://example.com'
            }
        ],
        multiYearImpact: {
            '2026': 100,
            '2027': 200,
            '2028': 300
        },
        conflictsWith: [],
        sources: []
    };

    const defaultProps = {
        reforms: [mockLever],
        isLeverInDsl: () => false,
        onLeverToggle: () => {},
        formatCurrency: (val: number) => `${val} €`,
    };

    it('displays implementation risks (pushbacks) when available', () => {
        render(<ReformDrawer {...defaultProps} />);
        
        // Should find the pushback description
        expect(screen.getByText('This is a risky reform.')).toBeInTheDocument();
        // Should find the type
        expect(screen.getByText(/Social/)).toBeInTheDocument();
    });

    it('displays multi-year impact notes when available', () => {
        render(<ReformDrawer {...defaultProps} />);
        
        // Should find some reference to multi-year impact
        // We expect to see the years and values, or at least a section header
        expect(screen.getByText(/2027/)).toBeInTheDocument();
        expect(screen.getByText(/200 €/)).toBeInTheDocument();
    });
});
