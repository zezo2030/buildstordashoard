// ربط منتجات الكتالوج الموجودة مسبقًا بشركة عبر رفع شيت Excel — بالكود فقط.
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { parseCodeColumnXlsx, type ParsedProductRow } from '../lib/product-xlsx';
import {
  planCompanyProductLink,
  type CatalogMatch,
  type CompanyLinkPlan,
} from '../lib/company-link-xlsx';
import { adminAssignCompanyProducts } from '../api/company-products';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { Btn, Field } from './ui';

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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (open) return;
    setFileName('');
    setParseError(null);
    setParsing(false);
    setDragOver(false);
    setPlan(null);
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
      const parsed = await parseCodeColumnXlsx(new Uint8Array(await file.arrayBuffer()));
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

  const linkRows = useMutation({
    mutationFn: async () => {
      if (!plan || plan.toLink.length === 0) throw new Error('لا توجد منتجات لربطها');
      const ids = [...new Set(plan.toLink.map((r) => r.productId))];
      setProgress({ done: 0, total: ids.length });
      const linked = await adminAssignCompanyProducts(companyId, ids);
      setProgress({ done: ids.length, total: ids.length });
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
          : `تم ربط ${linked} منتج بـ${companyName} — الأسعار من الشركة`,
      );
      qc.invalidateQueries({ queryKey: ['company-seller-products', companyId] });
      qc.invalidateQueries({ queryKey: ['company-assigned-product-ids', companyId] });
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
          عمود واحد:
          <span dir="ltr" className="mx-1 font-medium">Code</span>
          — حط كود المادة الموجود في الكتالوج، سطر لكل مادة. لا يُنشأ أي منتج جديد ولا يُوضع سعر: يُربط كل كود موجود في الكتالوج النشط بـ{companyName}، والشركة تسعّر من التطبيق.
        </p>

        {/* مفيش زر «تحميل نموذج»: الملف عمود واحد اسمه Code، فالنموذج مابيضيفش
            حاجة على السطر اللي فوق. */}
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
            disabled={parsing || !plan || plan.toLink.length === 0}
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
