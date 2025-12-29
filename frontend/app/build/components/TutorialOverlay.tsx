import { useEffect, useState, useCallback } from 'react';

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
        content: 'Le déficit public est hors de contrôle. Votre objectif : le ramener sous la barre des 3%.',
        position: 'bottom',
    },
    {
        targetId: 'treemap-container',
        title: 'Le Budget de l\'État',
        content: 'Chaque carré représente une mission (Education, Défense...). Plus le carré est gros, plus la dépense est importante.',
        position: 'right',
    },
    {
        targetId: 'left-panel-tabs',
        title: 'Leviers d\'Action',
        content: 'Basculez entre les "Missions" (dépenses par ministère) et les "Réformes" (mesures structurelles comme les retraites ou la fiscalité).',
        position: 'bottom',
    },
    {
        targetId: 'left-panel-list',
        title: 'Micro-Gestion',
        content: 'Vous pouvez aussi cliquer sur chaque mission pour ajuster les crédits ligne par ligne.',
        position: 'right',
    }
];

export function TutorialOverlay({
    onComplete,
    startSignal,
}: {
    onComplete: () => void;
    startSignal?: number | null;
}) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const currentStep = STEPS[currentStepIndex];

    useEffect(() => {
        // Check localStorage
        const hasSeen = localStorage.getItem('has_seen_tutorial');
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

    const handleNext = () => {
        if (currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        localStorage.setItem('has_seen_tutorial', 'true');
        setIsVisible(false);
        onComplete();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none font-['Outfit']">
            {/* Dark Overlay with "Hole" is tricky without a library. 
          Instead, we'll just use a semi-transparent dark background 
          and rely on Z-Index or a spotlight effect if we had time.
          For now: Simple Modal Approach focused on the element.
      */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto transition-opacity" />

            {/* Spotlight/Highlight Logic would go here, mimicking driver.js */}
            {/* But for a custom build, let's just place a card centrally or relative if possible. */}
            {/* To allow clicks on the target, we'd need to complex clip-path. */}
            {/* Simplified V1: Centered Card that explains what to look at. */}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                            Tutoriel {currentStepIndex + 1} / {STEPS.length}
                        </span>
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                            <span className="material-icons">close</span>
                        </button>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {currentStep.title}
                    </h3>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        {currentStep.content}
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
                        >
                            {currentStepIndex === STEPS.length - 1 ? 'C\'est parti !' : 'Suivant'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Optional: Highlight Ring helper (Visual only) */}
            {/* We can't easily position it without measuring DOM rects perfectly in a loop. */}
        </div>
    );
}
