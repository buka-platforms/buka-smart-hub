"use client";

import React, { memo, useEffect, useRef } from "react";

const TradingViewWidget = () => {
  const container = useRef<HTMLDivElement | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const containerEl = container.current;

    if (!containerEl || isInitialized.current) return;

    isInitialized.current = true;
    containerEl.innerHTML = "";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget h-full w-full";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.text = `
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

    containerEl.append(widget, script);

    return () => {
      isInitialized.current = false;
      containerEl.innerHTML = "";
    };
  }, []);

  return (
    <div
      className="tradingview-widget-container h-full min-h-[480px] w-full"
      ref={container}
    >
      <div className="tradingview-widget-container__widget h-full w-full" />
    </div>
  );
};

export default memo(TradingViewWidget);
