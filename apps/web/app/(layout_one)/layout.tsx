import LayoutOne from "@/components/Layout/One";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LayoutOne>{children}</LayoutOne>
    </>
  );
}
