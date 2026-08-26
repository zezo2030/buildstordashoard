// ربط منتجات الكتالوج الموجودة مسبقًا بشركة عبر رفع شيت Excel — بدون إنشاء منتجات جديدة.
// نفس نموذج الشيت المستخدم في استيراد المنتجات، والعمود الفعلي هنا هو Code (SKU).
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import {
  parseProductXlsx,
  type ParsedProductRow,
} from '../lib/product-xlsx';
import {
  planCompanyProductLink,
  type CatalogMatch,
  type CompanyLinkPlan,
} from '../lib/company-link-xlsx';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { Btn, Field, Input, Toggle } from './ui';

type Defaults = {
  price: string;
  compare_at_price: string;
  origin_country: string;
  min_order_qty: string;
  stock_qty: string;
  track_stock: boolean;
  is_active: boolean;
};

const defaultDefaults = (): Defaults => ({
  price: '',
  compare_at_price: '',
  origin_country: '',
  min_order_qty: '1',
  stock_qty: '100',
  track_stock: true,
  is_active: true,
});

const CHUNK = 100;

export function LinkCompanyProductsModal({
  open,
  companyId,
  companyName,
  onClose,
  onDone,
}: {
  open: boolean;
  companyId: string;
  companyName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [plan, setPlan] = useState<CompanyLinkPlan | null>(null);
  const [defaults, setDefaults] = useState<Defaults>(defaultDefaults);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (open) return;
    setFileName('');
    setParseError(null);
    setParsing(false);
    setDragOver(false);
    setPlan(null);
    setDefaults(defaultDefaults());
    setProgress(null);
    if (fileRef.current) fileRef.current.value = '';
  }, [open]);

  async function ingestFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setParseError('ارفع ملف Excel بصيغة xlsx');
      setPlan(null);
      return;
    }
    setFileName(file.name);
    setParseError(null);
    setPlan(null);
    setParsing(true);
    try {
      const parsed = await parseProductXlsx(new Uint8Array(await file.arrayBuffer()));
      setPlan(await buildLinkPlan(companyId, parsed.rows));
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setParsing(false);
    }
  }

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void ingestFile(file);
  }

  const defaultsInvalid = validateDefaults(defaults);

  const linkRows = useMutation({
    mutationFn: async () => {
      if (!plan || plan.toLink.length === 0) throw new Error('لا توجد منتجات لربطها');
      if (defaultsInvalid) throw new Error(defaultsInvalid);

      const price = Number(defaults.price);
      const compareAt = defaults.compare_at_price.trim() ? Number(defaults.compare_at_price) : null;
      const minOrder = Number(defaults.min_order_qty);
      const fallbackOrigin = defaults.origin_country.trim();
      const stockQty = defaults.track_stock && defaults.stock_qty.trim()
        ? Number(defaults.stock_qty)
        : null;

      const rows = plan.toLink.map((r) => ({
        seller_company_id: companyId,
        product_id: r.productId,
        unit_id: r.unitId,
        price,
        compare_at_price: compareAt,
        origin_country: r.originCountry?.trim() || fallbackOrigin || null,
        min_order_qty: minOrder,
        stock_qty: stockQty,
        track_stock: defaults.track_stock,
        is_active: defaults.is_active,
      }));

      setProgress({ done: 0, total: rows.length });
      let linked = 0;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const part = rows.slice(i, i + CHUNK);
        const { error } = await supabase.from('seller_products').insert(part);
        if (error) throw new Error(arError(error));
        linked += part.length;
        setProgress({ done: linked, total: rows.length });
      }
      return linked;
    },
    onSuccess: (linked) => {
      const skipped =
        (plan?.notInCatalog.length ?? 0)
        + (plan?.alreadyLinked.length ?? 0)
        + (plan?.missingSku.length ?? 0)
        + (plan?.duplicateInFile.length ?? 0);
      toast(
        'success',
        skipped > 0
          ? `تم ربط ${linked} منتج بـ${companyName} — تم تجاهل ${skipped} صف`
          : `تم ربط ${linked} منتج بـ${companyName}`,
      );
      qc.invalidateQueries({ queryKey: ['company-seller-products', companyId] });
      qc.invalidateQueries({ queryKey: ['company', companyId] });
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
    onSettled: () => setProgress(null),
  });

  const preview = plan?.toLink.slice(0, 8) ?? [];
  const duplicatesNote = (plan?.duplicateInFile.length ?? 0) > 0
    ? `و ${plan!.duplicateInFile.length} صف مكرر داخل الملف`
    : null;

  return (
    <Modal title="ربط منتجات من Excel" open={open} onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-subtext">
          نفس نموذج الشيت: Product Name, Made In, Code, Description, Image — العمود المؤثّر هو
          <span dir="ltr" className="mx-1 font-medium">Code</span>
          (SKU). لا يُنشأ أي منتج جديد: يُربط كل SKU موجود في الكتالوج النشط بـ{companyName}.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="السعر الافتراضي (د.ك)">
            <Input dir="ltr" type="number" step="0.001" min="0" value={defaults.price} onChange={(e) => setDefaults({ ...defaults, price: e.target.value })} />
          </Field>
          <Field label="سعر قبل الخصم">
            <Input dir="ltr" type="number" step="0.001" min="0" value={defaults.compare_at_price} onChange={(e) => setDefaults({ ...defaults, compare_at_price: e.target.value })} />
          </Field>
          <Field label="المنشأ الاحتياطي" hint="يُستخدم لو خلت خانة Made In">
            <Input value={defaults.origin_country} onChange={(e) => setDefaults({ ...defaults, origin_country: e.target.value })} placeholder="سعودي" />
          </Field>
          <Field label="حد أدنى">
            <Input dir="ltr" type="number" min="1" value={defaults.min_order_qty} onChange={(e) => setDefaults({ ...defaults, min_order_qty: e.target.value })} />
          </Field>
          <Field label="المخزون">
            <Input dir="ltr" type="number" min="0" value={defaults.stock_qty} disabled={!defaults.track_stock} onChange={(e) => setDefaults({ ...defaults, stock_qty: e.target.value })} />
          </Field>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={defaults.track_stock} onChange={() => setDefaults({ ...defaults, track_stock: !defaults.track_stock })} />
              تتبّع المخزون
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={defaults.is_active} onChange={() => setDefaults({ ...defaults, is_active: !defaults.is_active })} />
              نشط
            </label>
          </div>
        </div>

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
              <Stat label="سيُربط" value={plan.toLink.length} />
              <Stat label="مرتبط مسبقًا" value={plan.alreadyLinked.length} />
              <Stat label="غير موجود بالكتالوج" value={plan.notInCatalog.length} />
              <Stat label="بدون كود" value={plan.missingSku.length} />
            </div>
            {duplicatesNote && (
              <p className="text-xs text-subtext">يوجد {duplicatesNote}</p>
            )}
            {preview.length > 0 && (
              <div className="divide-y divide-line overflow-hidden rounded-lg bg-white ring-1 ring-line">
                {preview.map((r) => (
                  <div key={`${r.rowNumber}-${r.sku}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.catalogNameAr}</div>
                      <div className="text-xs text-subtext" dir="ltr">{r.sku}</div>
                    </div>
                    {r.originCountry && <span className="text-xs text-subtext">{r.originCountry}</span>}
                  </div>
                ))}
              </div>
            )}
            {plan.toLink.length > preview.length && (
              <p className="text-xs text-subtext">
                عرض أول {preview.length} من {plan.toLink.length} منتج سيُربط
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {progress && (
            <span className="me-auto text-sm text-subtext">
              جارٍ الربط {progress.done} / {progress.total}
            </span>
          )}
          <Btn variant="ghost" onClick={onClose} disabled={linkRows.isPending}>إلغاء</Btn>
          <Btn
            variant="accent"
            busy={linkRows.isPending}
            disabled={parsing || !plan || plan.toLink.length === 0 || !!defaultsInvalid}
            onClick={() => linkRows.mutate()}
          >
            ربط المنتجات
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

function validateDefaults(d: Defaults): string | null {
  const price = Number(d.price);
  if (d.price.trim() === '' || !Number.isFinite(price) || price < 0) return 'أدخل سعرًا افتراضيًا صالحًا';
  const compareAt = d.compare_at_price.trim() ? Number(d.compare_at_price) : null;
  if (compareAt != null && (!Number.isFinite(compareAt) || compareAt < price)) {
    return 'سعر المقارنة يجب أن يكون ≥ السعر';
  }
  const minOrder = Number(d.min_order_qty);
  if (!Number.isFinite(minOrder) || minOrder <= 0) return 'الحد الأدنى غير صالح';
  const stockQty = d.track_stock && d.stock_qty.trim() ? Number(d.stock_qty) : null;
  if (d.track_stock && stockQty != null && (!Number.isFinite(stockQty) || stockQty < 0)) {
    return 'المخزون غير صالح';
  }
  return null;
}

async function buildLinkPlan(companyId: string, rows: ParsedProductRow[]): Promise<CompanyLinkPlan> {
  const skus = [...new Set(rows.map((r) => r.sku.trim()).filter(Boolean))];
  if (skus.length === 0) return planCompanyProductLink(rows, new Map(), new Set());

  const catalogBySku = new Map<string, CatalogMatch>();
  for (let i = 0; i < skus.length; i += CHUNK) {
    const part = skus.slice(i, i + CHUNK);
    const listed = part.map((s) => `"${s.replaceAll('"', '')}"`).join(',');
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, source_code, name_ar, unit_id')
      .eq('is_active', true)
      .or(`sku.in.(${listed}),source_code.in.(${listed})`);
    if (error) throw new Error(arError(error));
    for (const p of data ?? []) {
      catalogBySku.set(p.sku, p);
      if (p.source_code) catalogBySku.set(p.source_code, p);
    }
  }

  const matchedIds = [...new Set([...catalogBySku.values()].map((m) => m.id))];
  const linkedProductIds = new Set<string>();
  for (let i = 0; i < matchedIds.length; i += CHUNK) {
    const part = matchedIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('seller_products')
      .select('product_id')
      .eq('seller_company_id', companyId)
      .in('product_id', part);
    if (error) throw new Error(arError(error));
    for (const r of data ?? []) linkedProductIds.add(r.product_id);
  }

  return planCompanyProductLink(rows, catalogBySku, linkedProductIds);
}
