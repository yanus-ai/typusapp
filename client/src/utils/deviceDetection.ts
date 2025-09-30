export const isMobileDevice = (): boolean => {
  // Check for mobile user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const userAgent = navigator.userAgent;

  // Check user agent
  if (mobileRegex.test(userAgent)) {
    return true;
  }

  // Check for touch device with small screen
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  return isTouchDevice && isSmallScreen;
};

export const isDesktopDevice = (): boolean => {
  return !isMobileDevice();
};