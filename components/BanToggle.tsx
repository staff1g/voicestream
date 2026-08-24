"use client";

import { useState, useEffect } from "react";

interface BanToggleProps {
  streamerUsername: string;
  chatterUsername: string;
  initiallyBanned: boolean;
  onToggle?: (newBannedState: boolean) => void;
}

export default function BanToggle({ streamerUsername, chatterUsername, initiallyBanned, onToggle }: BanToggleProps) {
  const [isBanned, setIsBanned] = useState(initiallyBanned);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsBanned(initiallyBanned);
  }, [initiallyBanned]);

  const toggleBan = async () => {
    setIsLoading(true);
    try {
      const method = isBanned ? "DELETE" : "POST";
      
      const response = await fetch("/api/streamer/ban", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamerUsername, chatterUsername }),
      });

      if (!response.ok) {
        throw new Error("Failed to update ban status");
      }

      const newState = !isBanned;
      setIsBanned(newState);
      onToggle?.(newState);
    } catch (error) {
      console.error(error);
      alert("Something went wrong updating the ban status.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={toggleBan} 
      disabled={isLoading}
      style={{
        padding: "8px 16px",
        backgroundColor: isBanned ? "#ef4444" : "#22c55e",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: isLoading ? "not-allowed" : "pointer",
        opacity: isLoading ? 0.7 : 1
      }}
    >
      {isLoading ? "Updating..." : isBanned ? "Unban" : "Ban"}
    </button>
  );
}
