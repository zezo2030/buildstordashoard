// بانرات الصفحة الرئيسية — صورة كاملة من Figma (النص والزر جوّه الصورة)، الضغط يفتح التخصصات.
import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Input, Toggle } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { Modal, ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';

type Banner = {
  id: string;
  image_url: string;
  cta_route: string;
  sort_order: number;
  is_active: boolean;
};

type BannerForm = {
  id?: string;
  image_url: string;
  cta_route: string;
  sort_order: number;
};

const TAXONOMY_BUCKET = 'taxonomy-images';
const DEFAULT_ROUTE = '/(buyer)/specialties';

async function uploadBannerImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('الملف يجب أن يكون صورة');
  if (file.size > 5 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `home/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(TAXONOMY_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(arError(error));
  const { data } = supabase.storage.from(TAXONOMY_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const emptyForm = (): BannerForm => ({
  image_url: '',
  cta_route: DEFAULT_ROUTE,
  sort_order: 0,
});

export default function Banners() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<BannerForm | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['home-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_banners')
        .select('id, image_url, cta_route, sort_order, is_active')
        .order('sort_order')
        .limit(100);
      if (error) throw new Error(arError(error));
      return data as Banner[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (b: Banner) => {
      const { error } = await supabase.from('home_banners').update({ is_active: !b.is_active }).eq('id', b.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home-banners'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('home_banners').delete().eq('id', id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم حذف البانر');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['home-banners'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const columns: Column<Banner>[] = [
    {
      key: 'preview',
      header: 'الصورة',
      render: (b) => (
        <img src={b.image_url} alt="" className="h-14 w-36 rounded-lg object-cover ring-1 ring-line" />
      ),
    },
    {
      key: 'route',
      header: 'عند الضغط',
      render: (b) => <span className="font-mono text-xs" dir="ltr">{b.cta_route || DEFAULT_ROUTE}</span>,
    },
    { key: 'sort', header: 'الترتيب', render: (b) => <span dir="ltr">{b.sort_order}</span> },
    {
      key: 'active',
      header: 'الحالة',
      render: (b) => <Toggle checked={b.is_active} onChange={() => toggleActive.mutate(b)} />,
    },
    {
      key: 'actions',
      header: '',
      render: (b) => (
        <div className="flex gap-2">
          <Btn
            variant="ghost"
            onClick={() =>
              setEditing({
                id: b.id,
                image_url: b.image_url,
                cta_route: b.cta_route || DEFAULT_ROUTE,
                sort_order: b.sort_order,
              })
            }
          >
            تعديل
          </Btn>
          <Btn variant="ghost" className="text-danger" onClick={() => setDeleting(b)}>حذف</Btn>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="بانرات الرئيسية"
        subtitle="ارفع صورة البانر كاملة من Figma (النص والزر جوّه الصورة). الضغط يفتح التخصصات."
        actions={<Btn variant="accent" onClick={() => setEditing('new')}>+ إضافة بانر</Btn>}
      />
      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        emptyTitle="لا توجد بانرات بعد"
      />
      {editing && (
        <BannerModal
          form={editing === 'new' ? emptyForm() : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['home-banners'] });
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="حذف البانر"
        message="سيتم حذف البانر نهائيًا من الرئيسية. متابعة؟"
        confirmLabel="حذف"
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function BannerModal({
  form: initial,
  onClose,
  onDone,
}: {
  form: BannerForm;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast('success', 'تم رفع الصورة');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.image_url.trim()) throw new Error('ارفع صورة البانر كاملة');
      const payload = {
        image_url: form.image_url.trim(),
        cta_route: form.cta_route.trim() || DEFAULT_ROUTE,
        sort_order: Number(form.sort_order) || 0,
        // النص مش بيتستخدم في التطبيق — الصورة كاملة من Figma
        brand_ar: null,
        title_ar: null,
        highlight_ar: null,
        body_ar: null,
        cta_label_ar: 'تسوق الان',
      };
      const q = form.id
        ? supabase.from('home_banners').update(payload).eq('id', form.id)
        : supabase.from('home_banners').insert(payload);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', form.id ? 'تم تحديث البانر' : 'تمت إضافة البانر');
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={form.id ? 'تعديل بانر' : 'إضافة بانر'} open onClose={onClose}>
      <div className="space-y-4">
        <Field label="صورة البانر الكاملة" hint="صدّر القسم كامل من Figma (النص + الزر داخل الصورة)">
          <div className="flex items-start gap-3">
            <div className="relative h-24 w-56 shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-line">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-subtext">
                  <ImagePlus size={22} />
                </div>
              )}
              {form.image_url && (
                <button
                  type="button"
                  className="absolute end-1 top-1 rounded-full bg-black/50 p-0.5 text-white"
                  onClick={() => setForm({ ...form, image_url: '' })}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onFile}
              />
              <Btn type="button" variant="ghost" busy={uploading} onClick={() => inputRef.current?.click()}>
                {form.image_url ? 'تغيير الصورة' : 'رفع صورة'}
              </Btn>
              <Input
                dir="ltr"
                placeholder="أو الصق رابط صورة…"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
              <p className="text-[11px] text-subtext">يفضّل 358×139 تقريبًا — JPEG / PNG حتى 5 ميجا</p>
            </div>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="عند الضغط يفتح" hint="افتراضي: التخصصات">
            <Input
              dir="ltr"
              value={form.cta_route}
              onChange={(e) => setForm({ ...form, cta_route: e.target.value })}
            />
          </Field>
          <Field label="الترتيب">
            <Input
              dir="ltr"
              type="number"
              value={String(form.sort_order)}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
          <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
        </div>
      </div>
    </Modal>
  );
}
