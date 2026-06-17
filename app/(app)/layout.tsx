import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="app-scroll h-full overflow-y-auto overscroll-none">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
