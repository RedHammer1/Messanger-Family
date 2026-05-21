import React, { createContext, useState } from 'react';

interface UiContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const UiContext = createContext<UiContextType | undefined>(undefined);

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const setSidebarOpen = (open: boolean) => setIsSidebarOpen(open);

  return (
    <UiContext.Provider value={{ isSidebarOpen, toggleSidebar, setSidebarOpen }}>
      {children}
    </UiContext.Provider>
  );
};