export interface RadioStation {
  streams: {
    radio_stream: {
      url: string;
      metadata_url: string;
      type: number;
    };
    radio_stream_id: {
      url: string;
      metadata_url: string;
      type: number;
    };
  }[];
  radio_station_streams: {
    radio_stream: {
      url: string;
      metadata_url: string;
      type: number;
    };
  }[];
  radio_stations_radio_streams: {
    radio_stream: {
      url: string;
      metadata_url: string;
      type: number;
    };
  }[];
  country: {
    id: number;
    name: string;
    name_alias: string;
  };
  country_id: {
    id: number;
    name: string;
    name_alias: string;
  };
  name: string;
  id: string;
  logo: string;
  city: string;
  slug: string;
}

export interface UnsplashType {
  id: string;
  urls: {
    regular: string;
    full: string;
    raw: string;
  };
  alt_description: unknown;
  links: {
    html: string;
  };
  user: {
    username: string;
    name: string;
    links: {
      html: string;
    };
  };
}

export interface AudioVisualizationOptions {
  preferredBarWidth: number;
  forcePreferredBarWidth: boolean;
  barSpacing: number;
  color: string;
  rainbowOpacity: number;
  element: string;
  height: number | null;
  width: number | null;
  numBars: number | null;
  hideIfZero: boolean;
  consecutiveZeroesLimit: number;
}

export interface RequestHeaders {
  [key: string]: string | undefined | null;
}
