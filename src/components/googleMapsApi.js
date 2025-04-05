// googleMapsApi.js
import { useState, useEffect } from "react";

const Maps_API_KEY = process.env.REACT_APP_Maps_API_KEY;

let googleMapsPromise = null;

const loadGoogleMapsScript = () => {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${Maps_API_KEY}&libraries=places&loading=async`; // Added loading=async
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("Google Maps API loaded successfully!");
      resolve(window.google);
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps API.");
      resolve(null);
    };
    document.head.appendChild(script);
  });
};

export const useGoogleMaps = () => {
  const [google, setGoogle] = useState(null);

  useEffect(() => {
    if (!googleMapsPromise) {
      googleMapsPromise = loadGoogleMapsScript();
    }

    googleMapsPromise.then((g) => {
      setGoogle(g);
    });

    return () => {
      // No cleanup needed for the script itself
    };
  }, []);

  return google;
};
