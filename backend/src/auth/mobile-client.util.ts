import { Request } from 'express';

/** Header enviado pelo app Android (`mobile/`) em toda requisição de auth. */
export const CLIENT_TYPE_HEADER = 'x-client-type';
/** Substitui o cookie `device_token` para o app mobile (dispositivo confiável no 2FA). */
export const DEVICE_TOKEN_HEADER = 'x-device-token';

/**
 * `true` quando a requisição vem do app mobile, que não usa cookies: recebe os tokens de sessão no
 * corpo da resposta e os devolve via `Authorization: Bearer` / corpo do `refresh`/`logout`.
 *
 * Em modo mobile as rotas de auth **ignoram os cookies** de propósito: sem isso, um script injetado
 * (XSS) na origem do frontend web poderia chamar `POST /auth/refresh` com os cookies httpOnly do
 * navegador + este header e ler o par de tokens no corpo — exatamente o que o httpOnly existe para
 * impedir. Lendo o refresh token só do corpo, o modo mobile não dá acesso a nada que o chamador já
 * não tivesse.
 */
export function isMobileClient(req: Request): boolean {
  return req.get(CLIENT_TYPE_HEADER) === 'mobile';
}

/** Token de dispositivo confiável: header `X-Device-Token` no app mobile, cookie `device_token` no web. */
export function readDeviceToken(req: Request, cookieName: string): string | undefined {
  if (isMobileClient(req)) {
    return req.get(DEVICE_TOKEN_HEADER) || undefined;
  }
  return req.cookies?.[cookieName];
}
