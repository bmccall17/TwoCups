import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScaledTypography } from '../theme';

const FONT_SIZE_KEY = '@twocups:font_size';

export type FontSizeOption = 'small' | 'medium' | 'large';

type ScaledTypography = ReturnType<typeof getScaledTypography>;

interface FontSizeContextValue {
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => Promise<void>;
  fontScale: number;
  scaledTypography: ScaledTypography;
  isLoading: boolean;
}

const FONT_SCALES: Record<FontSizeOption, number> = {
  small: 0.85,
  medium: 1,
  large: 1.15,
};

const FontSizeContext = createContext<FontSizeContextValue | undefined>(undefined);

interface FontSizeProviderProps {
  children: ReactNode;
}

export function FontSizeProvider({ children }: FontSizeProviderProps) {
  const [fontSize, setFontSizeState] = useState<FontSizeOption>('medium');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const saved = await AsyncStorage.getItem(FONT_SIZE_KEY);
        if (saved && (saved === 'small' || saved === 'medium' || saved === 'large')) {
          setFontSizeState(saved as FontSizeOption);
        }
      } catch (error) {
        console.warn('Failed to load font size preference:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFontSize();
  }, []);

  const setFontSize = useCallback(async (size: FontSizeOption) => {
    try {
      await AsyncStorage.setItem(FONT_SIZE_KEY, size);
      setFontSizeState(size);
    } catch (error) {
      console.error('Failed to save font size preference:', error);
      throw error;
    }
  }, []);

  const fontScale = FONT_SCALES[fontSize];
  const scaledTypography = useMemo(() => getScaledTypography(fontScale), [fontScale]);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, fontScale, scaledTypography, isLoading }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}

// Export scales for direct use if needed
export { FONT_SCALES };
