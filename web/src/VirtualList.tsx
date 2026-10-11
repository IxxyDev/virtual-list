import { useEffect, useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type Props = {
  count: number;
  rowHeight: number;
  renderRow: (index: number) => ReactNode;
  onEndReached: () => void;
  footer?: ReactNode;
};

export function VirtualList({ count, rowHeight, renderRow, onEndReached, footer }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });
  const rows = virtualizer.getVirtualItems();
  const lastIndex = rows.at(-1)?.index ?? -1;

  useEffect(() => {
    if (count === 0 || lastIndex >= count - 5) onEndReached();
  }, [count, lastIndex, onEndReached]);

  return (
    <div className="scroll" ref={scrollRef}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {rows.map((row) => (
          <div
            key={row.key}
            className="row-slot"
            style={{ transform: `translateY(${row.start}px)`, height: row.size }}
          >
            {renderRow(row.index)}
          </div>
        ))}
      </div>
      {footer}
    </div>
  );
}
