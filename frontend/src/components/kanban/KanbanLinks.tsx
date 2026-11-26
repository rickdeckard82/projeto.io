import { RefObject, useEffect, useState } from 'react';
import { WorkItem } from '../../types';
import { STATUS_GLOW } from './KanbanCard';

interface Link {
  key: string;
  d: string;
  color: string;
}

/** Folga da curva quando pai e filho estão na mesma coluna: cabe no padding da coluna. */
const SAME_COLUMN_BEND = 14;

/**
 * Linhas curvas ligando cada tarefa às suas subtarefas, só decorativas. Fica entre o fundo das
 * colunas e os cards (`z-[1]`; os cards usam `z-[2]`) e é recalculada a cada rolagem, já que as
 * colunas rolam por conta própria. Card rolado para fora da coluna fica sem linha.
 */
export function KanbanLinks({ boardRef, items }: { boardRef: RefObject<HTMLDivElement | null>; items: WorkItem[] }) {
  const [links, setLinks] = useState<Link[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    let frame = 0;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const origin = board.getBoundingClientRect();
        const offsetX = board.scrollLeft - origin.left;
        const offsetY = board.scrollTop - origin.top;
        const box = (id: string) => {
          const el = board.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
          const viewport = el?.closest('[data-kanban-scroll]')?.getBoundingClientRect();
          const rect = el?.getBoundingClientRect();
          if (!rect || !viewport || rect.bottom < viewport.top || rect.top > viewport.bottom) return null;
          return { left: rect.left + offsetX, right: rect.right + offsetX, y: (rect.top + rect.bottom) / 2 + offsetY };
        };

        const next: Link[] = [];
        for (const child of items) {
          if (!child.parentId) continue;
          const parent = box(child.parentId);
          const own = box(child.id);
          if (!parent || !own) continue;

          let d: string;
          if (Math.abs(parent.left - own.left) < 1) {
            // Mesma coluna: arco pela esquerda dos cards.
            const x = parent.left;
            d = `M ${x} ${parent.y} C ${x - SAME_COLUMN_BEND} ${parent.y}, ${x - SAME_COLUMN_BEND} ${own.y}, ${x} ${own.y}`;
          } else {
            const toRight = parent.left < own.left;
            const fromX = toRight ? parent.right : parent.left;
            const toX = toRight ? own.left : own.right;
            const mid = (fromX + toX) / 2;
            d = `M ${fromX} ${parent.y} C ${mid} ${parent.y}, ${mid} ${own.y}, ${toX} ${own.y}`;
          }
          next.push({ key: child.id, d, color: STATUS_GLOW[child.status.category] ?? '#64748b' });
        }
        // Só troca o estado se algo mudou: `items` pode chegar como um `[]` novo a cada render.
        setLinks((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        setSize((prev) =>
          prev.width === board.scrollWidth && prev.height === board.scrollHeight
            ? prev
            : { width: board.scrollWidth, height: board.scrollHeight },
        );
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    // Captura: a rolagem de cada coluna não borbulha até o quadro.
    board.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      board.removeEventListener('scroll', measure, true);
    };
  }, [boardRef, items]);

  return (
    <svg
      aria-hidden
      width={size.width}
      height={size.height}
      className="pointer-events-none absolute left-0 top-0 z-[1]"
    >
      {links.map((link) => (
        <path
          key={link.key}
          d={link.d}
          fill="none"
          stroke={link.color}
          strokeOpacity={0.55}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      ))}
    </svg>
  );
}
