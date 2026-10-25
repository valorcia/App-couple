'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FolderKanban, ListChecks, ShoppingBasket } from 'lucide-react';
import { Segmented } from '@couple/ui';
import { PageHeader } from '@/components/app/page-header';
import { ShoppingLists } from './shopping-lists';
import { Tasks } from './tasks';
import { Projects } from './projects';

type Tab = 'shopping' | 'tasks' | 'projects';
const TABS: Tab[] = ['shopping', 'tasks', 'projects'];

export function DailyPage() {
  const t = useTranslations('daily');
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'shopping';
  const icons = { shopping: <ShoppingBasket className="h-4 w-4" aria-hidden />, tasks: <ListChecks className="h-4 w-4" aria-hidden />, projects: <FolderKanban className="h-4 w-4" aria-hidden /> };

  return (
    <div className="container-page space-y-8 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <Segmented ariaLabel={t('title')} value={tab} onChange={(v) => router.replace(`/quotidien?tab=${v}`)} options={TABS.map((v) => ({ value: v, label: t(`tabs.${v}`), icon: icons[v] }))} className="max-w-xl" />
      {tab === 'shopping' ? <ShoppingLists /> : tab === 'tasks' ? <Tasks /> : <Projects />}
    </div>
  );
}
