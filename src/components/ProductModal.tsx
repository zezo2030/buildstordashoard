// فورم المنتج الكامل — الإضافة والتعديل.
//
// كان متعرّف جوّه صفحة «المنتجات» بس، وصفحة «التخصصات والفئات» كان ليها فورم
// أصغر (من غير أرقام التشابه وكلمات البحث وأماكن الكتالوج). المالك: «عاوز لما
// أخش على المواد من التخصصات تظهرلي نفس الصفحة دي». فبقى فورم واحد للصفحتين.
//
// فرق تاني مهم: الفورم الصغير كان بيكتب `specialty_id/category_id` بالمستوى
// المفتوح في كل تعديل — فتعديل مادة متحطّطة زيادة في المستوى ده كان بينقل
// مكانها الأساسي ليه من غير ما حد يقصد. هنا الأماكن بتتعدّل صراحة.
import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { uploadProductImage } from '../lib/product-image';
import { skuFromSourceCode } from '../lib/catalog-sku';
import { addSimilarCodes, MAX_SIMILAR_CODES } from '../lib/similar-codes';
import { addKeywords, parseKeywords, serializeKeywords } from '../lib/search-keywords';
import { Btn, Field, Input, Select, Toggle } from './ui';
import { Modal } from './Modal';
import { useToast } from './Toast';
import type { PathCategory, PathSpecialty } from '../lib/product-path';
import { PlacementsField, savePlacements, specialtyNeedsCategory } from './PlacementsField';
import { normalizePlacements, type Placement } from '../lib/product-placements';

/** اللي الفورم محتاجه من المنتج — الصفحتين بيجيبوه من مصادر مختلفة. */
export type ProductModalProduct = {
  id: string;
  sku: string;
  sourceCode: string | null;
  nameAr: string;
  images: string[];
  isActive: boolean;
};

export type CatalogTree = { specialties: PathSpecialty[]; categories: PathCategory[] };

/** شجرة الكتالوج كاملة — قوايم صغيرة، بتتجاب مرة وبتتشارك بين الجدول والفورم. */
export function useCatalogTree() {
  return useQuery<CatalogTree>({
    queryKey: ['catalog-tree'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [sp, cat] = await Promise.all([
        supabase.from('specialties').select('id, name_ar').order('sort_order'),
        supabase.from('categories').select('id, name_ar, parent_id, specialty_id').order('sort_order'),
      ]);
      if (sp.error) throw new Error(arError(sp.error));
      if (cat.error) throw new Error(arError(cat.error));
      return { specialties: sp.data ?? [], categories: (cat.data ?? []) as PathCategory[] };
    },
  });
}

export function ProductModal({ product, defaultPlacement, onImportExcel, onClose, onDone }: {
  product: ProductModalProduct | null;
  /** إضافة من مستوى في شجرة التخصصات ⇒ المكان الأول جاهز بالمستوى ده. */
  defaultPlacement?: Placement;
  /** زرار «رفع من Excel» — في الإضافة من شجرة التخصصات بس. */
  onImportExcel?: () => void;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [placements, setPlacements] = useState<Placement[]>(defaultPlacement ? [defaultPlacement] : []);
  const [similarCodes, setSimilarCodes] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [form, setForm] = useState({
    source_code: product?.sourceCode ?? '',
    name_ar: product?.nameAr ?? '',
    origin_country: '',
    image_url: product?.images?.[0] ?? '',
    unit_id: '',
    is_active: product?.isActive ?? true,
  });
  const generatedSku = form.source_code.trim() ? skuFromSourceCode(form.source_code) : '';
  const displaySku = product?.sku || generatedSku;

  const { data: tree } = useCatalogTree();

  const { data: units } = useQuery({
    queryKey: ['units-list'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('id, name_ar').order('code');
      if (error) throw new Error(arError(error));
      return data ?? [];
    },
  });

  // عند التعديل: جلب الوحدة والأماكن الحالية (الأساسي الأول)
  useQuery({
    queryKey: ['product-refs', product?.id],
    enabled: !!product,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('specialty_id, category_id, unit_id, origin_country, images, similar_codes, search_keywords, product_placements (specialty_id, category_id)')
        .eq('id', product!.id)
        .single();
      if (error) throw new Error(arError(error));
      if (data) {
        const primary: Placement = {
          specialtyId: data.specialty_id ?? '',
          categoryId: data.category_id ?? null,
        };
        const rest = (data.product_placements ?? []).map((p) => ({
          specialtyId: p.specialty_id,
          categoryId: p.category_id,
        }));
        setPlacements(normalizePlacements([primary, ...rest]));
        // أنواع `database.ts` المولّدة لسه ما اتجدّدتش بعد العمود الجديد.
        setSimilarCodes((data as { similar_codes?: string[] | null }).similar_codes ?? []);
        setKeywords(parseKeywords((data as { search_keywords?: string | null }).search_keywords));
        setForm((f) => ({
          ...f,
          unit_id: data.unit_id ?? '',
          origin_country: data.origin_country ?? '',
          image_url: data.images?.[0] ?? f.image_url,
        }));
      }
      return data;
    },
  });

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast('success', 'تم رفع صورة المنتج');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name_ar.trim()) throw new Error('الاسم مطلوب');
      if (!product && !form.source_code.trim()) throw new Error('الكود مطلوب');
      if (!form.unit_id) throw new Error('اختر الوحدة');
      const list = normalizePlacements(placements);
      const primary = list[0];
      if (!primary) throw new Error('أضف مكانًا واحدًا على الأقل للمنتج في الكتالوج');
      // المنتج بيتربط بورقة بس — قسم فيه فروع مايستقبلش منتجات مباشرة
      const cats = tree?.categories ?? [];
      for (const p of list) {
        if (!p.categoryId && specialtyNeedsCategory(cats, p.specialtyId)) {
          throw new Error('في تخصص فيه فروع — لازم تختار فئة (آخر فرع) لكل مكان');
        }
        if (p.categoryId && cats.some((c) => c.parent_id === p.categoryId)) {
          throw new Error('لا يمكن ربط المنتج بقسم فيه فروع — اختر آخر فرع في الشجرة');
        }
      }

      const payload = {
        sku: product?.sku ?? skuFromSourceCode(form.source_code),
        source_code: form.source_code.trim() || null,
        name_ar: form.name_ar.trim(),
        origin_country: form.origin_country.trim() || null,
        specialty_id: primary.specialtyId,
        category_id: primary.categoryId,
        unit_id: form.unit_id,
        images: form.image_url.trim() ? [form.image_url.trim()] : [],
        similar_codes: similarCodes,
        search_keywords: serializeKeywords(keywords),
        ...(product ? { is_active: form.is_active } : {}),
      };
      const q = product
        ? supabase.from('products').update(payload).eq('id', product.id).select('id').single()
        : supabase.from('products').insert(payload).select('id').single();
      const { data: saved, error } = await q;
      if (error) throw new Error(arError(error));
      if (!saved) throw new Error('تعذر حفظ المنتج');
      await savePlacements(saved.id, list);
    },
    onSuccess: () => {
      toast('success', product ? 'تم تحديث المنتج' : 'تمت إضافة المنتج');
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={product ? `تعديل — ${product.nameAr}` : 'إضافة منتج'} open onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="صورة المنتج">
          <div className="flex items-start gap-3">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-line">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-subtext">
                  <ImagePlus size={22} />
                </div>
              )}
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_url: '' })}
                  className="absolute top-1 start-1 rounded-full bg-primary/80 p-0.5 text-white hover:bg-danger"
                  title="إزالة الصورة"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              <Btn variant="ghost" busy={uploading} onClick={() => fileRef.current?.click()}>
                رفع صورة
              </Btn>
              <p className="text-xs text-subtext">PNG / JPG — حتى 5MB — تظهر في التطبيق</p>
            </div>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الكود" hint="كودك الخاص من الإكسل — لا يظهر في التطبيق">
            <Input
              dir="ltr"
              value={form.source_code}
              onChange={(e) => setForm({ ...form, source_code: e.target.value })}
            />
          </Field>
          <Field label="SKU" hint="يتولد تلقائيًا — حرف و 6 أرقام، يظهر في التطبيق">
            <Input dir="ltr" value={displaySku} readOnly className="bg-surface" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الاسم (عربي)">
            <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          </Field>
          <Field label="بلد المنشأ" hint="منشأ المادة في الكتالوج — البائع يقدر يحدد منشأ تاني لعرضه">
            <Input
              value={form.origin_country}
              onChange={(e) => setForm({ ...form, origin_country: e.target.value })}
              placeholder="مثال: كويتي / صيني"
            />
          </Field>
        </div>

        <SimilarCodesField value={similarCodes} onChange={setSimilarCodes} />

        <KeywordsField value={keywords} onChange={setKeywords} />

        <PlacementsField
          value={placements}
          onChange={setPlacements}
          specialties={tree?.specialties ?? []}
          categories={tree?.categories ?? []}
        />

        <Field label="الوحدة" hint="تظهر للمشتري جنب الكمية المطلوبة في التطبيق">
          <Select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })}>
            <option value="">اختر…</option>
            {(units ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.name_ar}</option>
            ))}
          </Select>
        </Field>
        {product && (
          <label className="flex items-center gap-2 text-sm">
            <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
            <span>{form.is_active ? 'نشط' : 'موقوف / مؤرشف'}</span>
          </label>
        )}
        <div className="flex justify-end gap-2">
          {onImportExcel && (
            <Btn variant="ghost" onClick={onImportExcel} className="me-auto">
              رفع من Excel
            </Btn>
          )}
          <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>إلغاء</Btn>
          <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
        </div>
      </div>
    </Modal>
  );
}

/**
 * أرقام التشابه — «ممكن أضيف كذا رقم».
 *
 * الرقم مجرد وسم: أي مادتين بينهم رقم مشترك بيظهروا لبعض في «منتجات مشابهة»
 * في التطبيق. مافيش جدول مجموعات يتصان — شيل الرقم تخرج المادة من المجموعة.
 */
function SimilarCodesField({ value, onChange }: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    if (!draft.trim()) return;
    onChange(addSimilarCodes(value, draft));
    setDraft('');
  };

  return (
    <Field
      label="أرقام التشابه"
      hint={`المواد اللي ليها نفس الرقم بتظهر لبعض في «منتجات مشابهة» في التطبيق — لحد ${MAX_SIMILAR_CODES} رقم`}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-2">
        {value.map((code) => (
          <span
            key={code}
            className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs text-primary"
            dir="ltr"
          >
            {code}
            <button
              type="button"
              onClick={() => onChange(value.filter((one) => one !== code))}
              title={`إزالة ${code}`}
              className="text-subtext hover:text-danger"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Enter بيحفظ الفورم في المودال، فبنمسكه هنا عشان يضيف الرقم بس.
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } }}
          onBlur={commit}
          placeholder="أضف أرقام للمنتجات المتشابهة"
          // الرقم نفسه LTR، لكن النص الإرشادي عربي فبيتقرا من اليمين.
          dir={draft ? 'ltr' : 'rtl'}
          className="min-w-48 flex-1 border-0 bg-transparent p-0 focus:ring-0"
        />
      </div>
    </Field>
  );
}

/**
 * كلمات بحث مخفية — المشتري بيدوّر بالبلدي («لحام» بدل «ماكينة لحام»)، فالكلمات
 * دي بتدخل في البحث بس ومش بتظهر في التطبيق. الفاصلة بتفصل، والمسافة لأ.
 */
function KeywordsField({ value, onChange }: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    if (!draft.trim()) return;
    onChange(addKeywords(value, draft));
    setDraft('');
  };

  return (
    <Field
      label="كلمات البحث"
      hint="كلمات المشتري ممكن يدوّر بيها بدل الاسم بالظبط (لحام، لحامة…) — بتلاقي المنتج في البحث ومش بتظهر في التطبيق. افصل بينها بفاصلة"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-2">
        {value.map((word) => (
          <span
            key={word}
            className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs text-primary ring-1 ring-line"
          >
            {word}
            <button
              type="button"
              onClick={() => onChange(value.filter((one) => one !== word))}
              title={`إزالة ${word}`}
              className="text-subtext hover:text-danger"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Enter بيحفظ الفورم في المودال، فبنمسكه هنا عشان يضيف الكلمة بس.
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === '،') { e.preventDefault(); commit(); }
          }}
          onBlur={commit}
          placeholder="أضف كلمات بحثية"
          className="min-w-32 flex-1 border-0 bg-transparent p-0 focus:ring-0"
        />
      </div>
    </Field>
  );
}
