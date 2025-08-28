import { useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { fetchCustomizationOptions } from '@/features/customization/customizationSlice';

let optionsLoadingStarted = false;

export const useGlobalCustomizationOptions = () => {
  const dispatch = useAppDispatch();
  const { availableOptions, optionsLoading } = useAppSelector(state => state.customization);
  const { isAuthenticated, isInitialized } = useAppSelector(state => state.auth);
  
  // Reset loading flag when user logs out
  useEffect(() => {
    if (!isAuthenticated && isInitialized) {
      optionsLoadingStarted = false;
    }
  }, [isAuthenticated, isInitialized]);
  
  useEffect(() => {
    // Only load customization options if user is authenticated
    if (
      isAuthenticated && 
      isInitialized && 
      !availableOptions && 
      !optionsLoading && 
      !optionsLoadingStarted
    ) {
      optionsLoadingStarted = true;
      dispatch(fetchCustomizationOptions());
    }
  }, [dispatch, availableOptions, optionsLoading, isAuthenticated, isInitialized]);
  
  return { availableOptions, optionsLoading };
};