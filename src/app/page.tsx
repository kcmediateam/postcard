"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { useData } from "@/lib/data/data-context";
import { hasReturnAddress } from "@/lib/profile";

/** Entry redirector: route to login / onboarding / dashboard by state. */
export default function Home() {
  const router = useRouter();
  const { session, loading } = useData();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
    else if (!hasReturnAddress(session.profile)) router.replace("/onboarding");
    else router.replace("/dashboard");
  }, [loading, session, router]);

  return <FullScreenLoader />;
}
