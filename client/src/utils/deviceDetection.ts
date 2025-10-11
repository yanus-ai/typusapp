export const isMobileDevice = (): boolean => {
  // Check for mobile user agents first (for actual mobile devices)
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const userAgent = navigator.userAgent;

  // If it's a real mobile device, always return true
  if (mobileRegex.test(userAgent)) {
    return true;
  }

  // For desktop browsers being resized, check screen width
  // This makes resize testing work properly
  const isSmallScreen = window.innerWidth <= 768;

  return isSmallScreen;
};

export const isDesktopDevice = (): boolean => {
  return !isMobileDevice();
};