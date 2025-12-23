"use client";

import { useEffect, useRef, useState } from "react";

interface TickingNumberProps {
    value: number;
    format?: (val: number) => string;
    className?: string;
}

export function TickingNumber({ value, format, className }: TickingNumberProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const startTimeRef = useRef<number | null>(null);
    const startValueRef = useRef(value);
    const targetValueRef = useRef(value);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (value !== targetValueRef.current) {
            startValueRef.current = displayValue;
            targetValueRef.current = value;
            startTimeRef.current = null;

            const animate = (timestamp: number) => {
                if (!startTimeRef.current) startTimeRef.current = timestamp;
                const progress = Math.min((timestamp - startTimeRef.current) / 800, 1); // 800ms duration

                // Easing function (easeOutQuart)
                const ease = 1 - Math.pow(1 - progress, 4);

                const current = startValueRef.current + (targetValueRef.current - startValueRef.current) * ease;
                setDisplayValue(current);

                if (progress < 1) {
                    animationFrameRef.current = requestAnimationFrame(animate);
                }
            };

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [value, displayValue]);

    return (
        <span className={className}>
            {format ? format(displayValue) : displayValue.toFixed(1)}
        </span>
    );
}
