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

export type ImportTarget = {
  specialtyId: string;
  categoryId: string | null;
  label: string;
};

export function ImportProductsModal({
  open,
  onClose,
  onDone,
  target,
  initialFile,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  target?: ImportTarget;
  initialFile?: File | null;
}) {
  const admin = useAdmin();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const ingestedRef = useRef<File | null>(null);
  const locked = !!target;
  const [pickedSpecialtyId, setPickedSpecialtyId] = useState('');
  const [pickedCategoryId, setPickedCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const specialtyId = target?.specialtyId ?? pickedSpecialtyId;
  const categoryId = target ? (target.categoryId ?? '') : pickedCategoryId;

  const { data: lookups } = useQuery({
    queryKey: ['product-lookups'],
    enabled: open && !locked,
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

  const { data: units } = useQuery({
    queryKey: ['units'],
    enabled: open && locked,
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('id, name_ar').order('code');
      if (error) throw new Error(arError(error));
      return data ?? [];
    },
  });

  useEffect(() => {
    if (open) return;
    setPickedSpecialtyId('');
    setPickedCategoryId('');
    setUnitId('');
    setFileName('');
    setParseError(null);
    setParsing(false);
    setDragOver(false);
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
  const unitOptions = locked ? (units ?? []) : (lookups?.units ?? []);

  async function ingestFile(file: File) {
    if (!isXlsxFile(file)) {
      setParseError('ارفع ملف Excel بصيغة xlsx مطابق للنموذج');
      setPlan(null);
      return;
    }
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

  useEffect(() => {
    if (!open) {
      ingestedRef.current = null;
      return;
    }
    if (!initialFile || ingestedRef.current === initialFile) return;
    ingestedRef.current = initialFile;
    void ingestFile(initialFile);
  }, [open, initialFile]);

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await ingestFile(file);
  }

  const importRows = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error('اختر ملف Excel أولاً');
      if (!specialtyId) throw new Error('التخصص غير محدد');
      if (!unitId) throw new Error('اختر الوحدة');
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
        {locked ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="سيُضاف في">
              <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-primary">
                {target?.label}
              </div>
            </Field>
            <Field label="الوحدة">
              <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">اختر…</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name_ar}</option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Field label="التخصص">
              <Select
                value={pickedSpecialtyId}
                onChange={(e) => {
                  setPickedSpecialtyId(e.target.value);
                  setPickedCategoryId('');
                }}
              >
                <option value="">اختر…</option>
                {(lookups?.specialties ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name_ar}</option>
                ))}
              </Select>
            </Field>
            <Field label="الفئة" hint="آخر فرع فقط (مش قسم فيه فروع)">
              <Select value={pickedCategoryId} onChange={(e) => setPickedCategoryId(e.target.value)}>
                <option value="">بدون فئة</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </Select>
            </Field>
            <Field label="الوحدة">
              <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">اختر…</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name_ar}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        <Field label="ملف Excel">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onPickFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void ingestFile(file);
            }}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm transition-colors ${
              dragOver ? 'border-accent bg-accent-soft text-primary' : 'border-line bg-surface text-subtext hover:border-accent hover:text-primary'
            }`}
          >
            <FileSpreadsheet size={22} />
            <span>{parsing ? 'جارٍ قراءة الملف…' : fileName || 'اسحب ملف Excel هنا أو اضغط للاختيار'}</span>
          </button>
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
            disabled={parsing || !plan || plan.toInsert.length === 0}
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

function isXlsxFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
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
