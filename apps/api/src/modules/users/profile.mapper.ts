import type { ProfileDto } from '@couple/types';

export function toProfileDto(
  profile: { displayName: string; avatarKey: string | null; bio: string | null; interests: string[] } | null,
): ProfileDto {
  return {
    displayName: profile?.displayName ?? '',
    avatarUrl: profile?.avatarKey ? `/media/${profile.avatarKey}` : null,
    bio: profile?.bio ?? null,
    interests: profile?.interests ?? [],
  };
}
