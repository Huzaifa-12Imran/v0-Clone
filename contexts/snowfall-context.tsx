"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SnowfallContextType {
  isSnowing: boolean;
  toggleSnowfall: () => void;
}

const SnowfallContext = createContext<SnowfallContextType | undefined>(undefined);

export function SnowfallProvider({ children }: { children: React.ReactNode }) {
  const [isSnowing, setIsSnowing] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("isSnowing");
    if (saved !== null) {
      setIsSnowing(saved === "true");
    }
  }, []);

  const toggleSnowfall = () => {
    setIsSnowing((prev) => {
      const newValue = !prev;
      localStorage.setItem("isSnowing", String(newValue));
      return newValue;
    });
  };

  return (
    <SnowfallContext.Provider value={{ isSnowing, toggleSnowfall }}>
      {children}
    </SnowfallContext.Provider>
  );
}

export function useSnowfall() {
  const context = useContext(SnowfallContext);
  if (context === undefined) {
    throw new Error("useSnowfall must be used within a SnowfallProvider");
  }
  return context;
}
