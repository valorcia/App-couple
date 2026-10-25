import { Gamepad2, HelpCircle, MessageCircleHeart, Scale, Sparkles, Users, Camera } from 'lucide-react';
import type { GameType } from '@couple/types';

export const GAME_META: Record<GameType, { icon: typeof Sparkles; tone: 'blush' | 'champagne' | 'plum' | 'default' | 'honey' | 'night' | 'sage' | 'warm' }> = {
  SECRET_ANSWERS: { icon: MessageCircleHeart, tone: 'blush' },
  WHO_KNOWS_BEST: { icon: HelpCircle, tone: 'honey' },
  DILEMMA: { icon: Scale, tone: 'night' },
  WHICH_OF_US: { icon: Users, tone: 'sage' },
  CONFESSIONS: { icon: Sparkles, tone: 'plum' },
  CHALLENGE: { icon: Gamepad2, tone: 'champagne' },
  MEMORY_QUIZ: { icon: Camera, tone: 'warm' },
};
