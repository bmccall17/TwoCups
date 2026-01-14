import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Dimensions } from 'react-native';
import { GemAnimation } from '../components/common/GemAnimation';

interface GemAnimationState {
  visible: boolean;
  amount: number;
  x: number;
  y: number;
  key: number;
}

interface GemAnimationContextType {
  showGemAnimation: (amount: number, x?: number, y?: number) => void;
}

const GemAnimationContext = createContext<GemAnimationContextType | undefined>(undefined);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function GemAnimationProvider({ children }: { children: React.ReactNode }) {
  const [animation, setAnimation] = useState<GemAnimationState>({
    visible: false,
    amount: 0,
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2,
    key: 0,
  });
  
  const keyRef = useRef(0);

  const showGemAnimation = useCallback((amount: number, x?: number, y?: number) => {
    keyRef.current += 1;
    setAnimation({
      visible: true,
      amount,
      x: x ?? SCREEN_WIDTH / 2,
      y: y ?? SCREEN_HEIGHT / 3,
      key: keyRef.current,
    });
  }, []);

  const handleComplete = useCallback(() => {
    setAnimation(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <GemAnimationContext.Provider value={{ showGemAnimation }}>
      {children}
      <GemAnimation
        key={animation.key}
        visible={animation.visible}
        amount={animation.amount}
        startX={animation.x}
        startY={animation.y}
        onComplete={handleComplete}
      />
    </GemAnimationContext.Provider>
  );
}

export function useGemAnimation() {
  const context = useContext(GemAnimationContext);
  if (!context) {
    throw new Error('useGemAnimation must be used within a GemAnimationProvider');
  }
  return context;
}
