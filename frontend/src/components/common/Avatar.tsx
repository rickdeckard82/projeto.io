export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div
      title={name}
      className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-700 text-[10px] font-semibold text-white"
    >
      {initials || '?'}
    </div>
  );
}
