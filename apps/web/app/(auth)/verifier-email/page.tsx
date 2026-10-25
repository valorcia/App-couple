import { Suspense } from 'react';
import { VerifyEmail } from '@/components/auth/verify-email';
export const metadata = { title: 'Confirmer mon adresse' };
export default function Page() { return <Suspense><VerifyEmail /></Suspense>; }
