import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const fmtDay = (iso: string) => format(new Date(iso), 'EEEE d MMMM', { locale: fr });
export const fmtTime = (iso: string) => format(new Date(iso), 'HH:mm');
export const fmtAgo = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
export const toIsoLocalInput = (d: Date) => d.toISOString();
