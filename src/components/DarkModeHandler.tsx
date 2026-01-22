"use client";

import { useEffect } from "react";

export function DarkModeHandler() {
  useEffect(() => {
    const updateDarkMode = () => {
      const darkInput = document.getElementById("dark") as HTMLInputElement;
      
      if (darkInput?.checked) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    // Function to setup event listeners
    const setupListeners = () => {
      const darkInput = document.getElementById("dark");
      const lightInput = document.getElementById("light");
      
      if (darkInput && lightInput) {
        // Set initial state
        updateDarkMode();
        
        // Listen for changes
        darkInput.addEventListener("change", updateDarkMode);
        lightInput.addEventListener("change", updateDarkMode);
        
        return () => {
          darkInput.removeEventListener("change", updateDarkMode);
          lightInput.removeEventListener("change", updateDarkMode);
        };
      }
      return undefined;
    };

    // Try to setup immediately
    let cleanup = setupListeners();
    
    // If elements not found, use MutationObserver to watch for them
    if (!cleanup) {
      const observer = new MutationObserver(() => {
        if (!cleanup) {
          cleanup = setupListeners();
          if (cleanup) {
            observer.disconnect();
          }
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      
      // Also try periodically as fallback
      const intervalId = setInterval(() => {
        if (!cleanup) {
          cleanup = setupListeners();
          if (cleanup) {
            clearInterval(intervalId);
            observer.disconnect();
          }
        }
      }, 100);
      
      return () => {
        observer.disconnect();
        clearInterval(intervalId);
        if (cleanup) cleanup();
      };
    }
    
    return cleanup;
  }, []);

  return null;
}
