import { BadRequestException } from '@nestjs/common';
import { BlockList, isIP } from 'net';
import { lookup } from 'dns/promises';

// Faixas privadas/locais: um webhook de usuário não pode alcançar a rede interna do servidor (SSRF).
const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3],
] as const) PRIVATE.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [['::', 127], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]] as const) {
  PRIVATE.addSubnet(net, prefix, 'ipv6');
}

export function isPrivateAddress(address: string): boolean {
  const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const ip = mapped ? mapped[1] : address;
  return PRIVATE.check(ip, isIP(ip) === 6 ? 'ipv6' : 'ipv4');
}

/**
 * Faz o POST de um webhook só para destino público via https, sem seguir redirect e com tempo limite.
 * shortcut: o nome é resolvido antes do fetch, que resolve de novo (DNS rebinding ainda é possível);
 * fixar o IP resolvido num Agent próprio se o app passar a ter usuários não confiáveis.
 */
export async function postToPublicUrl(rawUrl: string, init: { headers: Record<string, string>; body: string }) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') throw new BadRequestException('A URL do webhook precisa usar https.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new BadRequestException('A URL do webhook aponta para um endereço interno — não é permitido.');
  }
  return fetch(url, { method: 'POST', ...init, redirect: 'manual', signal: AbortSignal.timeout(10_000) });
}
