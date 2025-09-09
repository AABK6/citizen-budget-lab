"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dsfr: any;
  }
}

export const Dsfr = () => {
  useEffect(() => {
    // This effect runs once on the client after the component mounts.
    
    const initializeDsfr = () => {
      console.log("DSFR initialization triggered.");
      if (window.dsfr) {
        window.dsfr.start();
      }
    };

    // We need to ensure the DSFR script is loaded before we try to use it.
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@gouvfr/dsfr@1.12.0/dist/dsfr.module.min.js";
    script.type = "module";
    script.async = true;

    // When the script is loaded, we then wait for the entire window to be ready.
    script.onload = () => {
      // Check if the page is already loaded.
      if (document.readyState === 'complete') {
        initializeDsfr();
      } else {
        // Otherwise, wait for the window 'load' event.
        window.addEventListener('load', initializeDsfr, { once: true });
      }
    };

    document.body.appendChild(script);

    // Cleanup function to remove listeners and scripts if the component unmounts.
    return () => {
      window.removeEventListener('load', initializeDsfr);
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []); // Empty dependency array ensures this runs only once.

  return null; // This component renders nothing.
};
