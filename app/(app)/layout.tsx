import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-16 pb-16">
      {children}
      <BottomNav />
    </div>
  );
}
