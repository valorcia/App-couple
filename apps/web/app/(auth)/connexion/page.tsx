import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
export const metadata = { title: 'Connexion' };
export default function Page() { return <Suspense><LoginForm /></Suspense>; }
