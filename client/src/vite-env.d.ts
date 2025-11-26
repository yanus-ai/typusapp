/// <reference types="vite/client" />

declare module "*.lottie" {
  const src: string;
  export default src;
}

interface DataLayerEvent {
  event: string;
  [key: string]: any;
}

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
  }

  var dataLayer: DataLayerEvent[];
}

export {}