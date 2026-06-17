import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="h-full overflow-y-auto overscroll-none pt-16 pb-16">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
