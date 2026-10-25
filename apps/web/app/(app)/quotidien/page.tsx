import { Suspense } from 'react';
import { DailyPage } from '@/components/daily-life/daily-page';
export const metadata = { title: 'Quotidien' };
export default function Page() {
  return <Suspense fallback={null}><DailyPage /></Suspense>;
}
