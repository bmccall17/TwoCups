import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TabBarHeightContextType {
  height: number;
  setHeight: (height: number) => void;
}

const TabBarHeightContext = createContext<TabBarHeightContextType>({
  height: 0,
  setHeight: () => {},
});

export function TabBarHeightProvider({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(0);

  const updateHeight = useCallback((newHeight: number) => {
    setHeight(newHeight);
  }, []);

  return (
    <TabBarHeightContext.Provider value={{ height, setHeight: updateHeight }}>
      {children}
    </TabBarHeightContext.Provider>
  );
}

export function useTabBarHeightContext(): number {
  const { height } = useContext(TabBarHeightContext);
  return height;
}

export function useSetTabBarHeight(): (height: number) => void {
  const { setHeight } = useContext(TabBarHeightContext);
  return setHeight;
}
