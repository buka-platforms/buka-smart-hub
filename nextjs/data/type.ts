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

export interface Unsplash {
  id: string;
  urls: {
    regular: string;
    full: string;
    raw: string;
    small?: string;
  };
  alt_description?: string;
  links: {
    html: string;
  };
  user: {
    username: string;
    name: string;
    links: {
      html: string;
    };
    first_name?: string;
    profile_image?: {
      medium?: string;
    };
  };
  width?: number;
  height?: number;
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

export interface User {
  picture?: string;
  name?: string;
  provider_id?: string;
  provider_name?: string;
}

export interface UserSession {
  is_authenticated?: boolean;
  user_details?: User | null | undefined;
}
