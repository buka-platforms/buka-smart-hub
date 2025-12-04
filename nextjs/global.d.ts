export {};

declare global {
  interface Window {
    gtag?: (event: string, action: string, options: any) => void;
    __TOMORROW__: any;
    Tawk_API: any;
    adsbygoogle: any[];
  }
}
