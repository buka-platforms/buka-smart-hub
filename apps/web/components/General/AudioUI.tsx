import { Disc3 } from "lucide-react";

export function Loading({ ...props }) {
  const { className, color } = props;
  return (
    <>
      <Disc3 className={className} {...(color && { color })} />
    </>
  );
}
