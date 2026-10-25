import { Suspense } from 'react';
import { ResetForm } from '@/components/auth/reset-form';
export const metadata = { title: 'Nouveau mot de passe' };
export default function Page() { return <Suspense><ResetForm /></Suspense>; }
