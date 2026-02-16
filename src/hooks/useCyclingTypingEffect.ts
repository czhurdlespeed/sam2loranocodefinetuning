"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Hook for cycling typing effect that types each phrase, backspaces, then types the next
 * Stops and remains on the last phrase
 * @param phrases - Array of phrases to cycle through
 * @param typingSpeed - Typing speed in milliseconds per character (default: 50)
 * @param deletingSpeed - Deleting speed in milliseconds per character (default: 30)
 * @param pauseTime - Time to pause after completing a phrase before deleting (default: 2000)
 * @param start - Whether to start typing (default: true)
 */
export function useCyclingTypingEffect(
  phrases: string[],
  typingSpeed: number = 50,
  deletingSpeed: number = 30,
  pauseTime: number = 2000,
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
  const stateRef = useRef({
    currentPhraseIndex: 0,
    isDeleting: false,
    displayedText: "",
  });
  const phrasesRef = useRef(phrases);
  const typingSpeedRef = useRef(typingSpeed);
  const deletingSpeedRef = useRef(deletingSpeed);
  const pauseTimeRef = useRef(pauseTime);
  const startRef = useRef(start);
  const isInitializedRef = useRef(false);

  // Mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
    // Check sessionStorage after mount
    try {
      if (typeof window !== "undefined") {
        hasBeenShownRef.current = sessionStorage.getItem("typingEffectShown") === "true";
        if (hasBeenShownRef.current && phrases && phrases.length > 0) {
          // If already shown, set to last phrase immediately
          setDisplayedText(phrases[phrases.length - 1]);
          setIsComplete(true);
          const element = document.querySelector("#title-text");
          if (element && !element.querySelector(".emoji")) {
            const emojiSpan = document.createElement("span");
            emojiSpan.className = "emoji";
            emojiSpan.textContent = "👇";
            element.appendChild(emojiSpan);
            element.classList.remove("typing-text-visible");
          }
        }
      }
    } catch {
      // sessionStorage may be unavailable
    }
  }, [phrases]);

  // Update refs when props change
  useEffect(() => {
    phrasesRef.current = phrases;
    typingSpeedRef.current = typingSpeed;
    deletingSpeedRef.current = deletingSpeed;
    pauseTimeRef.current = pauseTime;
    startRef.current = start && !hasBeenShownRef.current;
  }, [phrases, typingSpeed, deletingSpeed, pauseTime, start]);

  useEffect(() => {
    // Don't run until mounted to avoid hydration mismatch
    if (!isMounted) {
      return;
    }

    // If already been shown, skip the effect and show final phrase
    if (hasBeenShownRef.current) {
      if (phrasesRef.current && phrasesRef.current.length > 0) {
        const lastPhrase = phrasesRef.current[phrasesRef.current.length - 1];
        setDisplayedText(lastPhrase);
        setIsComplete(true);
        const element = document.querySelector("#title-text");
        if (element && !element.querySelector(".emoji")) {
          const emojiSpan = document.createElement("span");
          emojiSpan.className = "emoji";
          emojiSpan.textContent = "👇";
          element.appendChild(emojiSpan);
          element.classList.remove("typing-text-visible");
        }
      }
      return;
    }

    if (
      !startRef.current ||
      hasBeenShownRef.current ||
      !phrasesRef.current ||
      phrasesRef.current.length === 0
    ) {
      if (phrasesRef.current && phrasesRef.current.length > 0) {
        setDisplayedText(phrasesRef.current[0]);
        setIsComplete(true);
        isInitializedRef.current = false;
      }
      return;
    }

    // Don't do anything if already complete
    if (isComplete) {
      return;
    }

    const scheduleNext = () => {
      // Check if we should stop (complete)
      if (isComplete) {
        return;
      }

      const currentPhrase =
        phrasesRef.current[stateRef.current.currentPhraseIndex];
      const isLastPhrase =
        stateRef.current.currentPhraseIndex === phrasesRef.current.length - 1;

      // If we're on the last phrase and it's complete, stop
      if (
        isLastPhrase &&
        !stateRef.current.isDeleting &&
        stateRef.current.displayedText === currentPhrase
      ) {
        setIsComplete(true);
        // Mark that the typing effect has been shown (persists across page refreshes within session)
        try {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("typingEffectShown", "true");
          }
        } catch {
          // sessionStorage may be unavailable
        }
        const element = document.querySelector("#title-text");
        if (element) {
          const emojiSpan = document.createElement("span");
          emojiSpan.className = "emoji";
          emojiSpan.textContent = "👇";
          element.appendChild(emojiSpan);
          element.classList.remove("typing-text-visible");
        }
        return;
      }

      if (!stateRef.current.isDeleting) {
        // Typing forward
        if (stateRef.current.displayedText.length < currentPhrase.length) {
          const nextLength = stateRef.current.displayedText.length + 1;
          const nextText = currentPhrase.slice(0, nextLength);
          stateRef.current.displayedText = nextText;
          setDisplayedText(nextText);
          timeoutRef.current = setTimeout(scheduleNext, typingSpeedRef.current);
        } else {
          // Finished typing current phrase, pause then start deleting (unless last phrase)
          if (isLastPhrase) {
            setIsComplete(true);
          } else {
            timeoutRef.current = setTimeout(() => {
              stateRef.current.isDeleting = true;
              scheduleNext();
            }, pauseTimeRef.current);
          }
        }
      } else {
        // Deleting backward
        if (stateRef.current.displayedText.length > 0) {
          const nextText = stateRef.current.displayedText.slice(0, -1);
          stateRef.current.displayedText = nextText;
          setDisplayedText(nextText);
          timeoutRef.current = setTimeout(
            scheduleNext,
            deletingSpeedRef.current
          );
        } else {
          // Finished deleting, move to next phrase - start typing immediately
          stateRef.current.isDeleting = false;
          stateRef.current.currentPhraseIndex =
            (stateRef.current.currentPhraseIndex + 1) %
            phrasesRef.current.length;
          const nextPhrase =
            phrasesRef.current[stateRef.current.currentPhraseIndex];
          const firstChar = nextPhrase.slice(0, 1);
          stateRef.current.displayedText = firstChar;
          setDisplayedText(firstChar);
          timeoutRef.current = setTimeout(scheduleNext, typingSpeedRef.current);
        }
      }
    };

    // Initialize and start the typing effect
    if (!isInitializedRef.current) {
      stateRef.current = {
        currentPhraseIndex: 0,
        isDeleting: false,
        displayedText: "",
      };
      setDisplayedText("");
      setIsComplete(false);
      isInitializedRef.current = true;

      // Start typing the first character immediately
      const currentPhrase = phrasesRef.current[0];
      const firstChar = currentPhrase.slice(0, 1);
      stateRef.current.displayedText = firstChar;
      setDisplayedText(firstChar);

      // Schedule the next character after a delay
      timeoutRef.current = setTimeout(scheduleNext, typingSpeedRef.current);
    } else if (!timeoutRef.current && !isComplete) {
      // If already initialized but timeout was cleared (effect re-ran),
      // continue from current state with appropriate delay
      const delay = stateRef.current.isDeleting
        ? deletingSpeedRef.current
        : typingSpeedRef.current;
      timeoutRef.current = setTimeout(scheduleNext, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isMounted, phrases, typingSpeed, deletingSpeed, pauseTime, start, isComplete]);

  return { displayedText, isComplete };
}
