import BackgroundImageContainerClient from "@/components/Home/BackgroundImageContainerClient";
import BackgroundImageLoading from "@/components/Home/BackgroundImageLoading";

export default function BackgroundImageContainer() {
  return (
    <>
      <div className="relative h-full w-full">
        <BackgroundImageLoading />
        <BackgroundImageContainerClient />
      </div>
    </>
  );
}
