import { useEffect, useState, useLayoutEffect, useCallback, useRef } from 'react';

export type TutorialStep = {
    targetId: string; // DOM ID to highlight
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
};

const STEPS: TutorialStep[] = [
    {
        targetId: 'scoreboard-deficit',
        title: 'Votre Mission',
        content: 'Le déficit public est hors de contrôle. Votre objectif est de le ramener sous la barre du déficit autorisé (3% du PIB).',
        position: 'bottom',
    },
    {
        targetId: 'treemap-container',
        title: 'Le Budget de l’État',
        content: 'Au centre, visualisez l’ensemble des dépenses. La taille des blocs est proportionnelle aux montants. Cliquez sur un bloc pour agir dessus.',
        position: 'bottom',
    },
    {
        targetId: 'left-panel-tabs',
        title: 'Leviers d’Action',
        content: 'À gauche, basculez entre les "Missions" (budgets des ministères) et les "Réformes" (mesures structurelles).',
        position: 'right',
    },
    {
        targetId: 'left-panel-list',
        title: 'Ajuster les Dépenses',
        content: 'Sélectionnez une ligne pour définir un objectif d’économie (ex: -10%). N’oubliez pas de valider avec le bouton "Apply Target" !',
        position: 'right',
    },
    {
        targetId: 'right-panel-revenue',
        title: 'Côté Recettes',
        content: 'À droite, trouvez des nouvelles ressources. Vous pouvez augmenter certains impôts ou réduire des niches fiscales pour combler le trou.',
        position: 'left',
    }
];

const TUTORIAL_VERSION = 'v2';
const STORAGE_KEY = `has_seen_tutorial_${TUTORIAL_VERSION}`;

export function TutorialOverlay({
    onComplete,
    startSignal,
}: {
    onComplete: () => void;
    startSignal?: number | null;
}) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const popoverRef = useRef<HTMLDivElement>(null);

    const currentStep = STEPS[currentStepIndex];

    useEffect(() => {
        // Check localStorage with versioning
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
            setIsVisible(true);
        } else {
            onComplete();
        }
    }, [onComplete]);

    useEffect(() => {
        if (startSignal === null || startSignal === undefined) return;
        setCurrentStepIndex(0);
        setIsVisible(true);
    }, [startSignal]);

    // Position the popover relative to the target
    const updatePosition = useCallback(() => {
        if (!isVisible || !currentStep) return;

        const targetEl = document.getElementById(currentStep.targetId);

        if (!targetEl) {
            // If target not found immediately, we can't position yet.
            // We'll rely on the retry mechanism in useLayoutEffect.
            // But if we must render, fallback to center.
            setPopoverStyle({
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                position: 'fixed'
            });
            return false; // Signal that we failed to anchor
        }

        // Auto-scroll to target with a slight delay to ensure UI is ready
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

        const rect = targetEl.getBoundingClientRect();
        const gap = 16;
        const popoverWidth = 320;

        // Default Preference
        let prefPos = currentStep.position || 'bottom';
        let style: React.CSSProperties = { position: 'fixed' };

        // Helper to calculate coords for a given position
        const calcCoords = (pos: string) => {
            const coords: any = {};
            switch (pos) {
                case 'right':
                    coords.top = rect.top + (rect.height / 2) - 100;
                    coords.left = rect.right + gap;
                    break;
                case 'left':
                    coords.top = rect.top + (rect.height / 2) - 100;
                    coords.left = rect.left - popoverWidth - gap;
                    break;
                case 'top':
                    coords.top = rect.top - gap - 300; // Estimated height
                    coords.left = rect.left + (rect.width / 2) - (popoverWidth / 2);
                    break;
                case 'bottom':
                default:
                    coords.top = rect.bottom + gap;
                    coords.left = rect.left + (rect.width / 2) - (popoverWidth / 2);
                    break;
            }
            return coords;
        };

        let coords = calcCoords(prefPos);

        // Simple Flip Logic if off-screen (Vertical only for now)
        if (prefPos === 'bottom' && coords.top > window.innerHeight - 250) {
            // Flip to top if bottom is too tight
            const topCoords = calcCoords('top');
            // If top is better (has more space > 0), use it. 
            // Better yet, just force a safe bottom position or stick to top
            style.top = Math.max(10, rect.top - 10 - 250); // rough calc
            style.left = coords.left;
        } else {
            style.top = coords.top;
            style.left = coords.left;
        }

        // Horizontal Clamp
        if (typeof style.left === 'number') {
            style.left = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, style.left));
        }

        // Vertical Clamp (Final Safety)
        if (typeof style.top === 'number') {
            style.top = Math.max(10, Math.min(window.innerHeight - 250, style.top));
        }

        setPopoverStyle(style);
        return true; // Anchored successfully
    }, [currentStep, isVisible]);

    useLayoutEffect(() => {
        let attempts = 0;
        const maxAttempts = 10;

        const tryLocate = () => {
            const success = updatePosition();
            if (!success && attempts < maxAttempts) {
                attempts++;
                requestAnimationFrame(tryLocate);
            }
        };

        tryLocate();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [updatePosition, currentStepIndex]); // Re-run when step changes

    const handleNext = () => {
        if (currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const handleClose = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsVisible(false);
        onComplete();
    };

    const handleSkip = () => {
        handleClose();
    };

    if (!isVisible || !currentStep) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none font-['Outfit']">
            {/* Semi-transparent background */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity" />

            {/* Anchored Card */}
            <div
                ref={popoverRef}
                className="absolute bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto border border-slate-200 w-[320px] transition-all duration-300 ease-out"
                style={popoverStyle}
            >
                {/* Arrow / Connector could go here if we calculated it precisely */}

                <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1">
                        Tutoriel {currentStepIndex + 1} / {STEPS.length}
                    </span>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors"
                        title="Fermer"
                    >
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">
                    {currentStep.title}
                </h3>
                <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                    {currentStep.content}
                </p>

                <div className="flex justify-between items-center gap-3">
                    <button
                        onClick={handleSkip}
                        className="text-xs font-medium text-slate-400 hover:text-slate-600 underline decoration-slate-300 underline-offset-2"
                    >
                        Passer
                    </button>

                    <div className="flex gap-2">
                        {currentStepIndex > 0 && (
                            <button
                                onClick={handleBack}
                                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium text-sm hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Retour
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-105"
                        >
                            {currentStepIndex === STEPS.length - 1 ? 'Terminer' : 'Suivant'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
