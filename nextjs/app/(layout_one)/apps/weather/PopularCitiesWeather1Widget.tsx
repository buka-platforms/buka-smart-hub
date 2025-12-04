"use client";

import React, { useEffect } from "react";

const PopularCitiesWeather1Widget = () => {
  useEffect(() => {
    (function (d, s, id) {
      if (d.getElementById(id)) {
        if (window.__TOMORROW__) {
          window.__TOMORROW__.renderWidget();
        }
        return;
      }
      const fjs = d.getElementsByTagName(s)[0];
      const js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = "https://www.tomorrow.io/v1/widget/sdk/sdk.bundle.min.js";

      fjs.parentNode?.insertBefore(js, fjs);
    })(document, "script", "tomorrow-sdk");
  }, []);

  /* eslint-disable @next/next/no-img-element */
  return (
    <div
      className="tomorrow relative w-full pb-[22px]"
      data-location-id="104057,019332,024053,122795,133210,015101"
      data-language="EN"
      data-unit-system="METRIC"
      data-skin="light"
      data-widget-type="current6"
    ></div>
  );
};

export default PopularCitiesWeather1Widget;
