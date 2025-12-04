"use client";

import React, { memo, useEffect, useRef } from "react";

const TradingViewWidget = () => {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
    {
      "autosize": true,
      "symbol": "NASDAQ:AAPL",
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "light",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "withdateranges": true,
      "allow_symbol_change": true,
      "watchlist": [
        "COINBASE:BTCUSD"
      ],
      "details": true,
      "hotlist": true,
      "calendar": true,
      "support_host": "https://www.tradingview.com"
    }`;
    container.current && (container.current as HTMLElement).appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container h-auto w-full" ref={container}>
      <div className="tradingview-widget-container__widget h-auto w-full"></div>
      <div className="tradingview-widget-copyright">
        <a
          href="https://www.tradingview.com/"
          rel="noopener nofollow"
          target="_blank"
        ></a>
      </div>
    </div>
  );
};

export default memo(TradingViewWidget);
