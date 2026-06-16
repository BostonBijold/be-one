"use client";

import Header from "@/components/Header";
import AnalyticsContent from "@/components/AnalyticsContent";

interface Props {
  userName: string;
  userImage: string | null;
  today: string;
  skipAuth?: boolean;
}

export default function AnalyticsView({ userName, userImage, today, skipAuth }: Props) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-mobile px-4 pb-12">
        <Header userName={userName} userImage={userImage} today={today} skipAuth={skipAuth} />
        <AnalyticsContent />
      </div>
    </div>
  );
}
