import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";

interface Props {
  searchParams: Promise<{
    projectKey?: string;
    projectName?: string;
    programLabel?: string;
    programName?: string;
  }>;
}

export default async function Dashboard({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardPageClient
      initialProjectKey={params.projectKey}
      initialProjectName={params.projectName}
      initialProgramLabel={params.programLabel}
      initialProgramName={params.programName}
    />
  );
}
