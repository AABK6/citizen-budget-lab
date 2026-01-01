import { useEffect, useState, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

export type TutorialStep = {
    targetId: string; // DOM ID to highlight
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
};

const STEPS: TutorialStep[] = [
    {
        targetId: 'scoreboard-deficit',
        title: `Point de Départ : 5%`,
        content: `Le déficit démarre à 5% du PIB (148,9 Md€). Ce chiffre correspond au budget initial proposé par le gouvernement, avant que le débat parlementaire ne s'arrête.`,
        position: 'bottom',
    },
    {
        targetId: 'treemap-container',
        title: `492 Milliards d'Euros`,
        content: `Voici la totalité des dépenses de l'État. La taille des blocs reflète le poids réel de chaque politique publique. Cliquez sur un bloc pour modifier son budget.`,
        position: 'right',
    },
    {
        targetId: 'left-panel-tabs',
        title: `Deux Leviers d'Action`,
        content: `Ici, l'onglet 'Orientations' vous permet de fixer des objectifs politiques globaux (ex: -5% sur les mobilités ou +10% sur les transports), et l'onglet 'Mesures' permet d'activer des réformes précises chiffrées (ex: geler le point d'indice) pour y parvenir.`,
        position: 'right',
    },
    {
        targetId: 'left-panel-list',
        title: `Fixer vos Priorités`,
        content: `Sélectionnez une mission pour ajuster son budget. C'est ici que vous décidez d'investir ou d'économiser. Chaque choix modifie l'équilibre global en temps réel.`,
        position: 'right',
    },
    {
        targetId: 'right-panel-revenue',
        title: `L'Équation Fiscale`,
        content: `L'autre levier : l'impôt. Pour équilibrer les comptes, vous pouvez aussi agir sur les recettes. TVA, ISF, impôt sur les sociétés ou sur le revenu : qui doit contribuer à l'effort ?`,
        position: 'left',
    },
    {
        targetId: 'scoreboard-resolution',
        title: `Trajectoire Macro`,
        content: `Visualisez l'impact de vos choix à moyen terme (2026-2029). La zone bleue indique le déficit, la ligne verte la croissance.`,
        position: 'bottom',
    }
];

const TUTORIAL_VERSION = 'v6';
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
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const popoverRef = useRef<HTMLDivElement>(null);

    const currentStep = STEPS[currentStepIndex];

    useEffect(() => {
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
            setIsVisible(true);
        } else {
            // Ensure we don't block the UI if seen
            // onComplete(); 
            // Note: onComplete might trigger something, let's just stay hidden.
        }
    }, []); // Only check on mount

    useEffect(() => {
        if (startSignal === null || startSignal === undefined) return;
        setCurrentStepIndex(0);
        setIsVisible(true);
    }, [startSignal]);

    // Update Layout Logic
    const updateLayout = useCallback(() => {
        if (!isVisible || !currentStep) return;

        const targetEl = document.getElementById(currentStep.targetId);
        if (!targetEl) {
            // Fallback center if target lost
            setTargetRect(null);
            setPopoverStyle({
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                position: 'fixed'
            });
            return;
        }

        // Scroll into view if needed
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

        const rect = targetEl.getBoundingClientRect();
        setTargetRect(rect);

        const gap = 24;
        const popoverWidth = 360;
        const popoverHeight = 200; // Approx estimation for placement

        let prefPos = currentStep.position || 'bottom';
        let top = 0;
        let left = 0;

        // Calculate positions
        const checkPos = (pos: string) => {
            switch (pos) {
                case 'right':
                    return {
                        top: rect.top + (rect.height / 2) - 100, // Vertically centered-ish
                        left: rect.right + gap
                    };
                case 'left':
                    return {
                        top: rect.top + (rect.height / 2) - 100,
                        left: rect.left - popoverWidth - gap
                    };
                case 'top':
                    return {
                        top: rect.top - gap - popoverHeight, // Assume height
                        left: rect.left + (rect.width / 2) - (popoverWidth / 2)
                    };
                case 'bottom':
                default:
                    return {
                        top: rect.bottom + gap,
                        left: rect.left + (rect.width / 2) - (popoverWidth / 2)
                    };
            }
        };

        let coords = checkPos(prefPos);

        // Simple boundary checks (flip if needed)
        const pad = 20;
        if (prefPos === 'bottom' && coords.top + popoverHeight > window.innerHeight - pad) {
            coords = checkPos('top');
        } else if (prefPos === 'top' && coords.top < pad) {
            coords = checkPos('bottom');
        } else if (prefPos === 'right' && coords.left + popoverWidth > window.innerWidth - pad) {
            coords = checkPos('left');
        } else if (prefPos === 'left' && coords.left < pad) {
            coords = checkPos('right');
        }

        // Hard Clamps
        coords.top = Math.max(pad, Math.min(window.innerHeight - pad - 100, coords.top));
        coords.left = Math.max(pad, Math.min(window.innerWidth - popoverWidth - pad, coords.left));

        setPopoverStyle({
            top: coords.top,
            left: coords.left,
            position: 'fixed',
            width: popoverWidth,
        });

    }, [currentStep, isVisible]);

    useLayoutEffect(() => {
        if (!isVisible) return;
        updateLayout();
        // Retry a few times in case of layout shifts
        const id = setInterval(updateLayout, 200);
        const timeout = setTimeout(() => clearInterval(id), 2000);

        window.addEventListener('resize', updateLayout);
        return () => {
            window.removeEventListener('resize', updateLayout);
            clearInterval(id);
            clearTimeout(timeout);
        };
    }, [updateLayout, currentStepIndex, isVisible]);


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

    if (!isVisible || !currentStep) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-auto font-['Outfit']">

            {/* SVG Spotlight Mask */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-500 ease-in-out">
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={targetRect.left - 8}
                                y={targetRect.top - 8}
                                width={targetRect.width + 16}
                                height={targetRect.height + 16}
                                fill="black"
                                rx="12"
                                className="transition-all duration-500 ease-in-out"
                            />
                        )}
                    </mask>
                </defs>
                {/* Dark Overlay with Hole */}
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(15, 23, 42, 0.65)"
                    mask="url(#spotlight-mask)"
                    className="backdrop-blur-[2px]"
                />

                {/* Highlight Border around target */}
                {targetRect && (
                    <rect
                        x={targetRect.left - 8}
                        y={targetRect.top - 8}
                        width={targetRect.width + 16}
                        height={targetRect.height + 16}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.6)"
                        strokeWidth="2"
                        strokeDasharray="8 4"
                        rx="12"
                        className="animate-pulse"
                    />
                )}
            </svg>

            {/* Content Popover */}
            <div
                ref={popoverRef}
                className="absolute bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)] rounded-2xl p-6 transition-all duration-500 ease-in-out flex flex-col gap-4"
                style={popoverStyle}
            >
                {/* Header / Step Indicator */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                        {STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStepIndex ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-300'}`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>

                {/* Content */}
                <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">
                        {currentStep.title}
                    </h3>
                    <p className="text-slate-600 text-[15px] leading-relaxed">
                        {currentStep.content}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                    <button
                        onClick={handleClose}
                        className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        Passer
                    </button>

                    <div className="flex gap-3">
                        {currentStepIndex > 0 && (
                            <button
                                onClick={handleBack}
                                className="px-4 py-2 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition-colors text-sm"
                            >
                                Retour
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] text-sm"
                        >
                            {currentStepIndex === STEPS.length - 1 ? "C'est parti !" : 'Suivant'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Click interceptor for outside clicks to advance? Optional, sticking to buttons for now */}
        </div>,
        document.body
    );
}
