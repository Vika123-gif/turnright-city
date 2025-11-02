import React from "react";

export default function FullscreenOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        fixed inset-0 z-[9999]
        bg-background
        overflow-y-auto
        min-h-[100dvh]
        pb-[calc(env(safe-area-inset-bottom,0px)+5rem)]
        isolation-auto
      "
    >
      {children}
    </div>
  );
}

