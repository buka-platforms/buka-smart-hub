"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import React, { useEffect, useRef, useState } from "react";

export default function Map({
  requestHeaders,
  styleUrl,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestHeaders: any;
  styleUrl: string;
}) {
  // const cfLat = requestHeaders["cf-iplatitude"] || 35.6844;
  const providerLat = requestHeaders["x-vercel-ip-latitude"];
  // const cfLng = requestHeaders["cf-iplongitude"] || 139.753;
  const providerLng = requestHeaders["x-vercel-ip-longitude"];

  const mapContainer = useRef(null);
  const map = useRef<maplibregl.Map | null>(null);
  // const [lng] = useState(cfLng);
  const [lng] = useState(providerLng);
  // const [lat] = useState(cfLat);
  const [lat] = useState(providerLat);
  const [zoom] = useState(14);

  useEffect(() => {
    if (map.current) return; // stops map from intializing more than once

    map.current = new maplibregl.Map({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      container: mapContainer.current as any,
      style: styleUrl,
      center: [lng, lat],
      zoom: zoom,
    });

    // Add zoom and rotation controls to the map.
    map.current?.addControl(new maplibregl.NavigationControl(), "bottom-right");

    // Add geolocate control to the map.
    map.current?.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
    );
  }, [lng, lat, zoom, styleUrl]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute h-full w-full" />
    </div>
  );
}
