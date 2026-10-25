import { Suspense } from 'react';
import { JoinCouple } from '@/components/couple/join-couple';
export const metadata = { title: 'Rejoindre mon partenaire' };
export default function Page() { return <Suspense><JoinCouple standalone /></Suspense>; }
