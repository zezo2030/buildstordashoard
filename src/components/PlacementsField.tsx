// «أماكن المنتج في الكتالوج» — الأدمن يشوف المنتج موجود فين بالمسار الكامل
// (من التخصص الرئيسي لغاية آخر فئة) ويضيف مكان جديد من سطر واحد.
import { useState } from 'react';
import { Star, Trash2, Plus } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { Btn, Field, Select } from './ui';
import { productPathText, type PathCategory, type PathSpecialty } from '../lib/product-path';
import {
  addPlacement, makePrimary, placementKey, removePlacement, type Placement,
} from '../lib/product-placements';

export type { Placement } from '../lib/product-placements';

/** أوراق الشجرة جوّه تخصص واحد — المنتج مايتربطش بقسم فيه فروع. */
function leavesOf(categories: readonly PathCategory[], specialtyId: string): PathCategory[] {
  const parents = new Set(categories.map((c) => c.parent_id).filter((id): id is string => !!id));
  return categories.filter((c) => c.specialty_id === specialtyId && !parents.has(c.id));
}

/** التخصص اللي فيه فروع لازم المنتج يتحط في آخر فرع، مش في التخصص نفسه. */
export function specialtyNeedsCategory(
  categories: readonly PathCategory[],
  specialtyId: string,
): boolean {
  return categories.some((c) => c.specialty_id === specialtyId && c.parent_id === null);
}

export function PlacementsField({ value, onChange, specialties, categories }: {
  value: Placement[];
  onChange: (next: Placement[]) => void;
  specialties: readonly PathSpecialty[];
  categories: readonly PathCategory[];
}) {
  const [draftSpecialty, setDraftSpecialty] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const draftLeaves = draftSpecialty ? leavesOf(categories, draftSpecialty) : [];
  const draftNeedsCategory = !!draftSpecialty && specialtyNeedsCategory(categories, draftSpecialty);

  function add() {
    if (!draftSpecialty) { setErr('اختر التخصص'); return; }
    if (draftNeedsCategory && !draftCategory) {
      setErr('التخصص فيه فروع — لازم تختار فئة (آخر فرع)');
      return;
    }
    setErr(null);
    onChange(addPlacement(value, { specialtyId: draftSpecialty, categoryId: draftCategory || null }));
    setDraftSpecialty('');
    setDraftCategory('');
  }

  return (
    <Field
      label="أماكن المنتج في الكتالوج"
      hint="أول مكان هو الأساسي — التقارير والخصومات بتمشي عليه. نفس المنتج ينفع يتحط في أكتر من تخصص أو أكتر من فرع في نفس التخصص."
    >
      <div className="space-y-2 rounded-lg border border-line p-2">
        {value.length === 0 ? (
          <p className="px-1 py-2 text-xs text-subtext">مافيش مكان لسه — أضف مكان واحد على الأقل</p>
        ) : (
          value.map((p, i) => {
            const key = placementKey(p);
            return (
              <div key={key} className="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 break-words">
                  {productPathText(specialties, categories, p.specialtyId, p.categoryId)}
                </span>
                {i === 0 ? (
                  <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                    أساسي
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      title="اجعله المكان الأساسي"
                      className="shrink-0 rounded p-1 text-subtext hover:bg-white hover:text-accent"
                      onClick={() => onChange(makePrimary(value, key))}
                    >
                      <Star size={14} />
                    </button>
                    <button
                      type="button"
                      title="إزالة المكان"
                      className="shrink-0 rounded p-1 text-danger hover:bg-red-50"
                      onClick={() => onChange(removePlacement(value, key))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}

        <div className="flex flex-wrap items-end gap-2 border-t border-line pt-2">
          <Select
            className="min-w-40 flex-1"
            value={draftSpecialty}
            onChange={(e) => { setDraftSpecialty(e.target.value); setDraftCategory(''); setErr(null); }}
          >
            <option value="">التخصص…</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>{s.name_ar}</option>
            ))}
          </Select>
          <Select
            className="min-w-40 flex-1"
            value={draftCategory}
            disabled={!draftSpecialty}
            onChange={(e) => { setDraftCategory(e.target.value); setErr(null); }}
          >
            <option value="">{draftNeedsCategory ? 'الفئة…' : 'بدون فئة'}</option>
            {draftLeaves.map((c) => (
              <option key={c.id} value={c.id}>
                {productPathText(specialties, categories, c.specialty_id, c.id)}
              </option>
            ))}
          </Select>
          <Btn type="button" variant="ghost" onClick={add}>
            <Plus size={15} /> إضافة مكان
          </Btn>
        </div>
        {err && <p className="px-1 text-xs text-danger">{err}</p>}
      </div>
    </Field>
  );
}

/**
 * بيكتب الأماكن على `product_placements`: بيمسح اللي اتشال ويضيف الجديد بس،
 * مش delete-then-insert للكل — عشان تريجر مزامنة `product_specialties`
 * مايشيلش تخصص لحظة ثم يرجّعه (التطبيق بيقرا من الجدول ده مباشرة).
 */
export async function savePlacements(productId: string, placements: readonly Placement[]) {
  const { data: current, error: readErr } = await supabase
    .from('product_placements')
    .select('id, specialty_id, category_id')
    .eq('product_id', productId);
  if (readErr) throw new Error(arError(readErr));

  const wanted = new Set(placements.map(placementKey));
  const staleIds = (current ?? [])
    .filter((r) => !wanted.has(placementKey({ specialtyId: r.specialty_id, categoryId: r.category_id })))
    .map((r) => r.id);

  const have = new Set(
    (current ?? []).map((r) => placementKey({ specialtyId: r.specialty_id, categoryId: r.category_id })),
  );
  const toAdd = placements.filter((p) => !have.has(placementKey(p)));

  if (toAdd.length) {
    const { error } = await supabase.from('product_placements').insert(
      toAdd.map((p) => ({
        product_id: productId,
        specialty_id: p.specialtyId,
        category_id: p.categoryId,
      })),
    );
    if (error) throw new Error(arError(error));
  }
  if (staleIds.length) {
    const { error } = await supabase.from('product_placements').delete().in('id', staleIds);
    if (error) throw new Error(arError(error));
  }
}
