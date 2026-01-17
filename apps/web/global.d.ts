export {};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (event: string, action: string, options: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __TOMORROW__: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Tawk_API: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adsbygoogle: any[];
  }
}
