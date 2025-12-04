import BackgroundImageContainerClient from "@/components/Home/BackgroundImageContainerClient";
import BackgroundImageLoading from "@/components/Home/BackgroundImageLoading";
import { getRequestHeaders } from "@/lib/header";

export default async function BackgroundImageContainer() {
  const requestHeaders = await getRequestHeaders();

  return (
    <>
      <div className="relative h-full w-full">
        <BackgroundImageLoading />
        <BackgroundImageContainerClient requestHeaders={requestHeaders} />
      </div>
    </>
  );
}
