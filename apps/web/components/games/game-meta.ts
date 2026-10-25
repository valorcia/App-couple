import { Gamepad2, HelpCircle, MessageCircleHeart, Scale, Sparkles, Users, Camera } from 'lucide-react';
import type { GameType } from '@couple/types';

export const GAME_META: Record<GameType, { icon: typeof Sparkles; tone: 'blush' | 'champagne' | 'plum' | 'default' }> = {
  SECRET_ANSWERS: { icon: MessageCircleHeart, tone: 'blush' },
  WHO_KNOWS_BEST: { icon: HelpCircle, tone: 'champagne' },
  DILEMMA: { icon: Scale, tone: 'plum' },
  WHICH_OF_US: { icon: Users, tone: 'default' },
  CONFESSIONS: { icon: Sparkles, tone: 'blush' },
  CHALLENGE: { icon: Gamepad2, tone: 'champagne' },
  MEMORY_QUIZ: { icon: Camera, tone: 'default' },
};
