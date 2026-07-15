import { useEffect, useState } from 'react';
import { gravatarUrl } from '../../lib/gravatar';

export function Avatar({
  name,
  src,
  email,
  size = 24,
}: {
  name: string;
  src?: string | null;
  email?: string;
  size?: number;
}) {
  const [srcFailed, setSrcFailed] = useState(false);
  const [gravatarFailed, setGravatarFailed] = useState(false);

  useEffect(() => {
    setSrcFailed(false);
    setGravatarFailed(false);
  }, [src, email]);

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const style = { width: size, height: size };

  const customSrc = src && !srcFailed ? src : null;
  const fallbackSrc = !customSrc && email && !gravatarFailed ? gravatarUrl(email) : null;
  const imgSrc = customSrc || fallbackSrc;

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={name}
        title={name}
        onError={() => (customSrc ? setSrcFailed(true) : setGravatarFailed(true))}
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
