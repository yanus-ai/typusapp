import React from 'react';
import { useGlobalCustomizationOptions } from '@/hooks/useGlobalCustomizationOptions';

interface CustomizationOptionsProviderProps {
  children: React.ReactNode;
}

export const CustomizationOptionsProvider: React.FC<CustomizationOptionsProviderProps> = ({ children }) => {
  useGlobalCustomizationOptions();
  
  return <>{children}</>;
};