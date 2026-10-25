import { ProjectDetail } from '@/components/daily-life/project-detail';
export const metadata = { title: 'Projet' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetail id={id} />;
}
