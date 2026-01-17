export async function getSurahList() {
  const res = await fetch("https://api.alquran.cloud/v1/surah", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch surah list");
  const json = await res.json();
  return json.data || json;
}

export async function getSurah(surahNumber: number, edition = "ar.alafasy") {
  const res = await fetch(
    `https://api.alquran.cloud/v1/surah/${surahNumber}/${edition}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch surah");
  const json = await res.json();
  return json.data || json;
}
