import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileSpreadsheet } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { imageBytesToFile, imageBytesToObjectUrl, uploadProductImage } from '../lib/product-image';
import { parseProductXlsx, planProductImport, type ImportPlan, type ParsedProductRow } from '../lib/product-xlsx';
import { useAdmin } from './Guard';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { Btn, Field, Select } from './ui';

type Lookups = {
  specialties: { id: string; name_ar: string }[];
  categories: { id: string; name_ar: string; specialty_id: string; parent_id: string | null }[];
  units: { id: string; name_ar: string }[];
};

export function ImportProductsModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const admin = useAdmin();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [specialtyId, setSpecialtyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: lookups } = useQuery({
    queryKey: ['product-lookups'],
    enabled: open,
    queryFn: async (): Promise<Lookups> => {
      const [sp, cat, un] = await Promise.all([
        supabase.from('specialties').select('id, name_ar').order('sort_order'),
        supabase.from('categories').select('id, name_ar, specialty_id, parent_id').order('sort_order'),
        supabase.from('units').select('id, name_ar').order('code'),
      ]);
      return {
        specialties: sp.data ?? [],
        categories: (cat.data ?? []) as Lookups['categories'],
        units: un.data ?? [],
      };
    },
  });

  useEffect(() => {
    if (open) return;
    setSpecialtyId('');
    setCategoryId('');
    setUnitId('');
    setFileName('');
    setParseError(null);
    setParsing(false);
    setPlan(null);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = '';
  }, [open]);

  const parentIds = useMemo(
    () => new Set((lookups?.categories ?? []).map((c) => c.parent_id).filter((id): id is string => !!id)),
    [lookups],
  );
  const cats = (lookups?.categories ?? []).filter(
    (c) => (!specialtyId || c.specialty_id === specialtyId) && !parentIds.has(c.id),
  );

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setPlan(null);
    setParsing(true);
    try {
      const parsed = await parseProductXlsx(new Uint8Array(await file.arrayBuffer()));
      const skus = [...new Set(parsed.rows.map((r) => r.sku.trim()).filter(Boolean))];
      const existing = await fetchExistingSkus(skus);
      setPlan(planProductImport(parsed.rows, existing));
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  const importRows = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error('اختر ملف Excel أولاً');
      if (!specialtyId || !unitId) throw new Error('اختر التخصص والوحدة');
      await assertLeafCategory(specialtyId, categoryId || null);
      const rows = plan.toInsert;
      if (rows.length === 0) throw new Error('لا توجد منتجات جديدة للإضافة');
      setProgress({ done: 0, total: rows.length });
      let added = 0;
      for (const row of rows) {
        const images = row.image ? [await uploadProductImage(imageBytesToFile(row.image.bytes, row.image.ext))] : [];
        const { error } = await supabase.from('products').insert({
          sku: row.sku,
          name_ar: row.nameAr,
          description_ar: row.descriptionAr,
          origin_country: row.originCountry,
          specialty_id: specialtyId,
          category_id: categoryId || null,
          unit_id: unitId,
          images,
          created_by: admin.id,
        });
        if (error) throw new Error(arError(error));
        added += 1;
        setProgress({ done: added, total: rows.length });
      }
      return added;
    },
    onSuccess: (added) => {
      const skipped = (plan?.skippedDuplicate.length ?? 0) + (plan?.skippedInvalid.length ?? 0);
      toast(
        'success',
        skipped > 0
          ? `تمت إضافة ${added} منتج — تم تجاهل ${skipped}`
          : `تمت إضافة ${added} منتج`,
      );
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
    onSettled: () => setProgress(null),
  });

  const preview = plan?.toInsert.slice(0, 8) ?? [];

  return (
    <Modal title="رفع منتجات من Excel" open={open} onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-subtext">
          نفس نموذج الشيت: Product Name, Made In, Code, Description, Image. أعمدة Shop تُتجاهل، والـ SKU الموجود مسبقاً لا يُضاف.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="التخصص">
            <Select
              value={specialtyId}
              onChange={(e) => {
                setSpecialtyId(e.target.value);
                setCategoryId('');
              }}
            >
              <option value="">اختر…</option>
              {(lookups?.specialties ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name_ar}</option>
              ))}
            </Select>
          </Field>
          <Field label="الفئة" hint="آخر فرع فقط (مش قسم فيه فروع)">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">بدون فئة</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </Select>
          </Field>
          <Field label="الوحدة">
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">اختر…</option>
              {(lookups?.units ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.name_ar}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="ملف Excel">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onPickFile}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="ghost" busy={parsing} onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet size={16} />
              اختيار ملف
            </Btn>
            <span className="text-sm text-subtext">{fileName || 'لم يُختر ملف بعد'}</span>
          </div>
        </Field>
        {parseError && <p className="text-sm text-danger">{parseError}</p>}
        {plan && (
          <div className="space-y-3 rounded-xl bg-surface p-3 ring-1 ring-line">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Stat label="سيُضاف" value={plan.toInsert.length} />
              <Stat label="SKU موجود" value={plan.skippedDuplicate.length} />
              <Stat label="ناقص اسم/كود" value={plan.skippedInvalid.length} />
              <Stat label="بصور" value={plan.toInsert.filter((r) => r.image).length} />
            </div>
            {preview.length > 0 && (
              <div className="divide-y divide-line overflow-hidden rounded-lg bg-white ring-1 ring-line">
                {preview.map((r) => (
                  <PreviewRow key={`${r.rowNumber}-${r.sku}`} row={r} />
                ))}
              </div>
            )}
            {plan.toInsert.length > preview.length && (
              <p className="text-xs text-subtext">
                عرض أول {preview.length} من {plan.toInsert.length} منتج سيُضاف
              </p>
            )}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          {progress && (
            <span className="me-auto text-sm text-subtext">
              جارٍ الإضافة {progress.done} / {progress.total}
            </span>
          )}
          <Btn variant="ghost" onClick={onClose} disabled={importRows.isPending}>إلغاء</Btn>
          <Btn
            variant="accent"
            busy={importRows.isPending}
            disabled={!plan || plan.toInsert.length === 0}
            onClick={() => importRows.mutate()}
          >
            تأكيد الرفع
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-subtext">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function PreviewRow({ row }: { row: ParsedProductRow }) {
  const url = useMemo(() => {
    if (!row.image) return null;
    return imageBytesToObjectUrl(row.image.bytes, row.image.ext);
  }, [row.image]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm">
      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-surface ring-1 ring-line">
        {url ? <img src={url} alt="" className="size-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{row.nameAr}</div>
        <div className="text-xs text-subtext" dir="ltr">{row.sku}</div>
      </div>
      <div className="text-xs text-subtext">{row.originCountry ?? '—'}</div>
    </div>
  );
}

async function fetchExistingSkus(skus: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < skus.length; i += 100) {
    const part = skus.slice(i, i + 100);
    const { data, error } = await supabase.from('products').select('sku').in('sku', part);
    if (error) throw new Error(arError(error));
    for (const r of data ?? []) found.add(r.sku);
  }
  return found;
}

async function assertLeafCategory(specialtyId: string, categoryId: string | null) {
  if (categoryId) {
    const { count, error } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', categoryId);
    if (error) throw new Error(arError(error));
    if ((count ?? 0) > 0) {
      throw new Error('لا يمكن ربط المنتج بقسم فيه فروع — اختر آخر فرع في الشجرة');
    }
    return;
  }
  const { count, error } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('specialty_id', specialtyId)
    .is('parent_id', null);
  if (error) throw new Error(arError(error));
  if ((count ?? 0) > 0) {
    throw new Error('التخصص فيه فروع — لازم تختار فئة (آخر فرع) للمنتج');
  }
}
