import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReformSidebarList } from './ReformSidebarList';
import type { PolicyLever } from '../types';

describe('ReformSidebarList', () => {
    const mockLevers: PolicyLever[] = [
        {
            id: 'test-1',
            label: 'Test Reform',
            description: 'A test description',
            family: 'TAXES',
            fixedImpactEur: 500000000,
            pushbacks: [{ type: 'social', description: 'This is a risky reform.' }],
            multiYearImpact: { '2027': 600000000 },
            budgetSide: 'SPENDING',
            paramsSchema: {},
            feasibility: { law: true, adminLagMonths: 6 },
            conflictsWith: [],
            sources: []
        },
        {
            id: 'test-2',
            label: 'Featured Reform',
            description: 'A test description',
            family: 'TAXES',
            majorAmendment: true,
            fixedImpactEur: 1000000000,
            budgetSide: 'SPENDING',
            paramsSchema: {},
            feasibility: { law: true, adminLagMonths: 6 },
            conflictsWith: [],
            sources: []
        }
    ];

    const mockProps = {
        onSelectReform: vi.fn(),
        levers: mockLevers,
        isLeverSelected: vi.fn().mockReturnValue(false),
        onHoverReform: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the list of reforms grouped by family', () => {
        render(<ReformSidebarList {...mockProps} />);
        
        expect(screen.getByText('Fiscalité')).toBeInTheDocument();
        expect(screen.getByText('Test Reform')).toBeInTheDocument();
    });

    it('opens ReformDetailDrawer when a reform is clicked', () => {
        render(<ReformSidebarList {...mockProps} />);
        
        const reformItem = screen.getByText('Test Reform');
        fireEvent.click(reformItem);
        
        // The drawer should now be visible with description and vigilance points
        // (ReformDetailDrawer is rendered by ReformSidebarList)
        expect(screen.getByText(/Points de vigilance/)).toBeInTheDocument();
        expect(screen.getByText('This is a risky reform.')).toBeInTheDocument();
    });

    it('displays featured levers in the "À la une" section', () => {
        render(<ReformSidebarList {...mockProps} />);
        
        expect(screen.getByText('À la une')).toBeInTheDocument();
        // Since it's in both "À la une" and the main list, we use AllBy
        const items = screen.getAllByText('Featured Reform');
        expect(items.length).toBeGreaterThanOrEqual(1);
    });
});