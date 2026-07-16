import { useEffect, useState } from 'react';

/**
 * Nunca usa serviços de avatar de terceiros (ex.: Gravatar) como fallback automático: isso
 * enviaria o e-mail (hash) de um usuário — muitas vezes de outra pessoa sendo exibida na tela,
 * sem conhecimento dela — para um servidor fora da infraestrutura própria, sem base legal
 * conhecida (LGPD). Sem `src` customizado, o fallback é sempre as iniciais do nome, geradas
 * localmente.
 */
export function Avatar({
  name,
  src,
  size = 24,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const [srcFailed, setSrcFailed] = useState(false);

  useEffect(() => {
    setSrcFailed(false);
  }, [src]);

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const style = { width: size, height: size };

  const imgSrc = src && !srcFailed ? src : null;

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={name}
        title={name}
        onError={() => setSrcFailed(true)}
        style={style}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div
      title={name}
      style={style}
      className="flex items-center justify-center rounded-full bg-indigo-700 font-semibold text-white"
    >
      <span style={{ fontSize: Math.max(size * 0.4, 10) }}>{initials || '?'}</span>
    </div>
  );
}
