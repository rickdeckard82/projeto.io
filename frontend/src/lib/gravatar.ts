import { md5 } from './md5';

/**
 * Monta a URL do avatar Gravatar a partir do e-mail do usuário. Usa `d=404` como parâmetro, o que faz o Gravatar responder com um 404 real (em vez de uma imagem placeholder) quando o e-mail não tem avatar cadastrado, permitindo que o `<img onError>` do chamador faça o fallback de forma limpa.
 * @param email - e-mail do usuário (será normalizado com trim + lowercase antes do hash)
 * @returns URL completa do avatar no Gravatar
 */
export function gravatarUrl(email: string): string {
  const hash = md5(email.trim().toLowerCase());
  // d=404 makes Gravatar respond with a real 404 (instead of a placeholder image)
  // when the e-mail has no registered avatar, so <img onError> can fall back cleanly.
  return `https://www.gravatar.com/avatar/${hash}?d=404`;
}
