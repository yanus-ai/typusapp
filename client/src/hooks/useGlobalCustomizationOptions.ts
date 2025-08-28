import { useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { fetchCustomizationOptions } from '@/features/customization/customizationSlice';

let optionsLoadingStarted = false;

export const useGlobalCustomizationOptions = () => {
  const dispatch = useAppDispatch();
  const { availableOptions, optionsLoading } = useAppSelector(state => state.customization);
  
  useEffect(() => {
    if (!availableOptions && !optionsLoading && !optionsLoadingStarted) {
      optionsLoadingStarted = true;
      dispatch(fetchCustomizationOptions());
    }
  }, [dispatch, availableOptions, optionsLoading]);
  
  return { availableOptions, optionsLoading };
};