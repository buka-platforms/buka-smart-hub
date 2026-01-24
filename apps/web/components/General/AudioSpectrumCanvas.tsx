export default function AudioSpectrumCanvas() {
  return (
    <>
      <div
        id="vis-box"
        className="pointer-events-none fixed right-0 bottom-0 left-0 z-0 m-0 h-60 w-full p-0 md:h-80"
      >
        <canvas id="vis-canvas"></canvas>
      </div>
    </>
  );
}
