import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTutorialStore, tutorialSteps } from '@/stores/tutorialStore';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialOverlay() {
  const { isActive, currentStep, nextStep, prevStep, closeTutorial } = useTutorialStore();
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = tutorialSteps[currentStep];

  const calculatePositions = useCallback(() => {
    if (!step) return;

    const target = document.querySelector(step.targetSelector);
    if (!target) {
      // Element not found, try to show tooltip centered
      setHighlightRect(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 175,
        arrowPosition: 'top',
      });
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = 6;

    setHighlightRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    const tooltipWidth = 350;
    const tooltipHeight = 220;
    const gap = 14;

    let top = 0;
    let left = 0;
    let arrowPosition: TooltipPosition['arrowPosition'] = 'top';

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = 'top';
        break;
      case 'top':
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = 'bottom';
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        arrowPosition = 'left';
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        arrowPosition = 'right';
        break;
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - tooltipHeight - 12));

    setTooltipPos({ top, left, arrowPosition });
  }, [step]);

  useEffect(() => {
    if (isActive) {
      // Small delay for animation
      requestAnimationFrame(() => {
        setIsVisible(true);
        calculatePositions();
      });
    } else {
      setIsVisible(false);
    }
  }, [isActive, calculatePositions]);

  useEffect(() => {
    if (isActive) {
      // Delay to allow React to re-render after onEnter state changes
      const timer = setTimeout(() => calculatePositions(), 150);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isActive, calculatePositions]);

  useEffect(() => {
    if (!isActive) return;
    const handleResize = () => calculatePositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive, calculatePositions]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevStep();
          break;
        case 'Escape':
          e.preventDefault();
          closeTutorial();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, closeTutorial]);

  if (!isActive || !step) return null;

  const totalSteps = tutorialSteps.length;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isWelcome = currentStep === 0;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[9999] transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Overlay using SVG cutout for highlight */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left}
                y={highlightRect.top}
                width={highlightRect.width}
                height={highlightRect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="hsl(215 25% 15% / 0.55)"
          mask="url(#tutorial-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={closeTutorial}
        />
      </svg>

      {/* Highlight border ring */}
      {highlightRect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary/60 ring-offset-2 ring-offset-transparent transition-all duration-300 pointer-events-none"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      )}

      {/* Tooltip */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          className="absolute z-[10000] w-[350px] animate-fade-in"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Passo {currentStep + 1} de {totalSteps}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={closeTutorial}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-4 pb-2">
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 py-2">
              {tutorialSteps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-all duration-200',
                    i === currentStep
                      ? 'bg-primary w-4'
                      : i < currentStep
                        ? 'bg-primary/40'
                        : 'bg-border'
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 pb-4 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStep}
                disabled={isFirst}
                className="h-8 text-xs gap-1 px-2"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={closeTutorial}
                className="h-8 text-xs text-muted-foreground"
              >
                Fechar
              </Button>

              <Button
                size="sm"
                onClick={nextStep}
                className="h-8 text-xs gap-1 px-3"
              >
                {isLast ? 'Concluir tutorial' : 'Próximo'}
                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
