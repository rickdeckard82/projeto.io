/** Marca no payload do token de desafio de 2FA — distingue esse token (nunca aceito como sessão) de um access token de verdade. Usada por `AuthService.login` (assina) e `TwoFactorService.verifyChallenge` (confere), num arquivo próprio para as duas não precisarem se importar uma à outra. */
export const TWO_FACTOR_CHALLENGE_PURPOSE = '2fa-challenge';
