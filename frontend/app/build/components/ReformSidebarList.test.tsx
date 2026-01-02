import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReformSidebarList } from './ReformSidebarList';
import { PolicyLever } from '../types';

describe('ReformSidebarList', () => {
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
        }
    };

    const defaultProps = {
        levers: [mockLever],
        isLeverSelected: () => false,
        onSelectReform: () => {},
    };

    it('displays implementation risks (pushbacks) when available', () => {
        render(<ReformSidebarList {...defaultProps} />);
        
        // Should find the pushback description
        expect(screen.getByText('This is a risky reform.')).toBeInTheDocument();
        // Should find the header
        expect(screen.getByText(/Risques et points de vigilance/)).toBeInTheDocument();
    });

    it('displays multi-year impact notes when available', () => {
        render(<ReformSidebarList {...defaultProps} />);
        
        // Should find reference to multi-year impact
        expect(screen.getByText(/Trajectoire pluriannuelle/)).toBeInTheDocument();
        expect(screen.getByText(/2027/)).toBeInTheDocument();
    });
    
    it('displays featured levers in the main list (no filtering)', () => {
        const featuredLever = { ...mockLever, id: 'featured', majorAmendment: true, label: 'Featured Reform' };
        render(<ReformSidebarList {...defaultProps} levers={[featuredLever]} />);
        
        // It should appear as a badge (top) AND in the list
        // Badge has icon only usually, or short label. 
        // List has description.
        
        // We expect "Featured Reform" to be present.
        // We can check if description is present, which only appears in the list card.
        expect(screen.getByText('A test description')).toBeInTheDocument();
    });
});
