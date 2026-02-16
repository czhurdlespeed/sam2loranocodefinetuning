"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Hook for typing effect that types out text once
 * @param text - The text to type out
 * @param speed - Typing speed in milliseconds per character (default: 50)
 * @param start - Whether to start typing (default: true)
 */
export function useTypingEffect(
  text: string,
  speed: number = 50,
  start: boolean = true
) {
  // Track if component has mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);

  // Check if typing effect has already been shown (persists across page refreshes within session)
  // Only check after mount to avoid hydration mismatch
  const hasBeenShownRef = useRef(false);

  // Always start with empty string to ensure SSR/client match
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);
  const textRef = useRef(text);
  const speedRef = useRef(speed);
  const startRef = useRef(start);

  // Mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
    // Check sessionStorage after mount
    try {
      if (typeof window !== "undefined") {
        hasBeenShownRef.current = sessionStorage.getItem("typingEffectShown") === "true";
        if (hasBeenShownRef.current) {
          // If already shown, set to final text immediately
          setDisplayedText(text || "");
          setIsComplete(true);
          const element = document.querySelector("#description-text");
          if (element) {
            element.classList.remove("typing-text-visible");
          }
        }
      }
    } catch {
      // sessionStorage may be unavailable
    }
  }, [text]);

  // Update refs when props change
  useEffect(() => {
    textRef.current = text;
    speedRef.current = speed;
    startRef.current = start && !hasBeenShownRef.current;
  }, [text, speed, start]);

  useEffect(() => {
    // Don't run until mounted to avoid hydration mismatch
    if (!isMounted) {
      return;
    }
    // If already been shown, skip the effect
    if (hasBeenShownRef.current) {
      setDisplayedText(text || "");
      setIsComplete(true);
      const element = document.querySelector("#description-text");
      if (element) {
        element.classList.remove("typing-text-visible");
      }
      return;
    }

    if (!startRef.current || !textRef.current) {
      setDisplayedText(textRef.current || "");
      setIsComplete(true);
      currentIndexRef.current = 0;
      const element = document.querySelector("#description-text");
      if (element) {
        element.classList.remove("typing-text-visible");
      }
      return;
    }

    // Reset state
    setDisplayedText("");
    setIsComplete(false);
    currentIndexRef.current = 0;

    const typeNext = () => {
      if (currentIndexRef.current < textRef.current.length) {
        setDisplayedText(textRef.current.slice(0, currentIndexRef.current + 1));
        currentIndexRef.current++;
        timeoutRef.current = setTimeout(typeNext, speedRef.current);
      } else {
        setIsComplete(true);
        // Mark that the typing effect has been shown (persists across page refreshes within session)
        try {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("typingEffectShown", "true");
          }
        } catch {
          // sessionStorage may be unavailable
        }
        const element = document.querySelector("#description-text");
        if (element) {
          element.classList.remove("typing-text-visible");
        }
      }
    };

    // Start typing immediately (no initial delay)
    typeNext();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isMounted, text, speed, start]);

  return { displayedText, isComplete };
}
