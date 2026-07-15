import { md5 } from './md5';

export function gravatarUrl(email: string): string {
  const hash = md5(email.trim().toLowerCase());
  // d=404 makes Gravatar respond with a real 404 (instead of a placeholder image)
  // when the e-mail has no registered avatar, so <img onError> can fall back cleanly.
  return `https://www.gravatar.com/avatar/${hash}?d=404`;
}
