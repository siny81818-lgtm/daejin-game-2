import React, { useEffect, useRef } from 'react';
import { MoleScene, MoleSceneCallbacks } from '../three/MoleScene';

interface GameCanvasProps {
  callbacks: MoleSceneCallbacks;
  onSceneReady: (scene: MoleScene) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ callbacks, onSceneReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MoleScene | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new MoleScene(containerRef.current, callbacks);
    sceneRef.current = scene;
    onSceneReady(scene);

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none"
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    />
  );
};
