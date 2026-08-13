// خلية الموقع — سطر للمكان وسطر للمستلم ورقمه. بتتكرر في ٣ جداول فمكانها هنا.
import type { Loc } from '../api/location';

export function LocationCell({ loc }: { loc: Loc | null }) {
  if (!loc) return <span className="text-subtext">—</span>;
  const contact = [loc.contactName, loc.contactPhone].filter(Boolean);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate font-medium">{loc.name ?? '—'}</span>
      {loc.address && <span className="truncate text-xs text-subtext">{loc.address}</span>}
      {contact.length > 0 && (
        <span className="truncate text-xs text-subtext">
          {loc.contactName}
          {loc.contactName && loc.contactPhone && ' · '}
          {loc.contactPhone && <span dir="ltr">{loc.contactPhone}</span>}
        </span>
      )}
    </div>
  );
}
