import type {
  RadioStation,
  RadioStationStreamRelation,
  RadioStream,
} from "@/data/type";

const isValidStreamType = (type?: number): type is number =>
  type === 1 || type === 2;

const isDirectRadioStream = (
  stream?: RadioStream | RadioStationStreamRelation | null,
): stream is RadioStream =>
  !!stream &&
  typeof stream.url === "string" &&
  typeof stream.metadata_url === "string" &&
  isValidStreamType(stream.type);

const normalizeRadioStream = (
  stream?: RadioStream | RadioStationStreamRelation | null,
): RadioStream | null => {
  if (!stream) {
    return null;
  }

  if (isDirectRadioStream(stream)) {
    return stream;
  }

  if (stream.radio_stream && isDirectRadioStream(stream.radio_stream)) {
    return stream.radio_stream;
  }

  if (
    typeof stream.url === "string" &&
    typeof stream.metadata_url === "string" &&
    isValidStreamType(stream.type)
  ) {
    return {
      url: stream.url,
      metadata_url: stream.metadata_url,
      type: stream.type,
    };
  }

  return null;
};

export const getRadioStreams = (
  radioStation?: RadioStation | null,
): RadioStream[] => {
  if (!radioStation) {
    return [];
  }

  return [
    ...(radioStation.streams ?? []),
    ...(radioStation.radio_station_streams ?? []),
    ...(radioStation.radio_stations_radio_streams ?? []),
  ]
    .map((stream) => normalizeRadioStream(stream))
    .filter((stream): stream is RadioStream => stream !== null);
};

export const getPrimaryRadioStream = (
  radioStation?: RadioStation | null,
): RadioStream | null => getRadioStreams(radioStation)[0] ?? null;
