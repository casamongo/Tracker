"use client";

import dynamic from "next/dynamic";

const DashboardPage = dynamic(
  () => import("./DashboardPage").then((m) => m.DashboardPage),
  { ssr: false }
);

interface Props {
  initialProjectKey?: string;
  initialProjectName?: string;
  initialProgramLabel?: string;
  initialProgramName?: string;
}

export function DashboardPageClient(props: Props) {
  return <DashboardPage {...props} />;
}
