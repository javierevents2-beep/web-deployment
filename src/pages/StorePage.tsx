import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AddToCartModal from '../components/store/AddToCartModal';
import type { Product as StoreProductType } from '../types/store';
import { db } from '../utils/firebaseClient';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../utils/format';
import { DBCoupon, fetchCoupons, bestCouponForItem } from '../utils/couponsService';

interface StoreProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category?: string;
  active?: boolean;
  allow_name?: boolean;
  allow_custom_image?: boolean;
  permiteTexto?: boolean;
  permiteFoto?: boolean;
  permiteAudio?: boolean;
  tieneVariantes?: boolean;
  variantes?: { nombre: string; precio: number }[];
  variants?: { name: string; priceDelta?: number; price?: number }[];
}

const StorePage: React.FC = () => {
  const { addToCart, items } = useCart();
  const location = useLocation() as any;
  const navigate = useNavigate();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<DBCoupon[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<StoreProduct | null>(null);
  const [showFinalizeBar, setShowFinalizeBar] = useState(false);

  const fromBooking = Boolean(location?.state?.fromCart);
  const hasStoreItems = Array.isArray(items) && items.some(i => i.type === 'store');

  const isDressCategory = (cat?: string) => {
    const c = String(cat || '').toLowerCase();
    return c.includes('vestid') || c.includes('dress');
  };

  const fetchProducts = async () => {
    try {
      const col = collection(db, 'products');
      let q: any = col;
      try { q = query(col, orderBy('created_at', 'desc')); } catch (_) { q = col; }
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
      const normalized: StoreProduct[] = items.map((p) => ({
        id: String(p.id),
        name: String(p.name || 'Producto'),
        price: Number(p.price || 0),
        description: p.description ? String(p.description) : '',
        image_url: p.image_url || p.image || '',
        category: p.category ? String(p.category) : 'General',
        active: p.active !== false,
        allow_name: Boolean(p.allow_name),
        allow_custom_image: Boolean(p.allow_custom_image),
        permiteTexto: Boolean(p.permiteTexto),
        permiteFoto: Boolean(p.permiteFoto),
        permiteAudio: Boolean(p.permiteAudio),
        tieneVariantes: Boolean(p.tieneVariantes),
        variantes: Array.isArray(p.variantes) ? p.variantes : undefined,
        variants: Array.isArray(p.variants) ? p.variants : undefined,
      }));
      const cleaned = normalized.filter(p => !isDressCategory(p.category));
      const seen = new Set<string>();
      const unique = cleaned.filter(p => {
        const key = `${p.name.trim().toLowerCase()}|${Number(p.price)||0}|${String(p.category||'').trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setProducts(unique);
    } catch (err) {
      console.error('fetchProducts error:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (fromBooking && !hasStoreItems) {
      const t = setTimeout(() => setShowFinalizeBar(true), 50);
      return () => clearTimeout(t);
    } else {
      setShowFinalizeBar(false);
    }
  }, [fromBooking, hasStoreItems]);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchCoupons();
        console.log('StorePage coupons fetched:', list);
        setCoupons(list);
      } catch (e) {
        console.error('StorePage fetchCoupons error:', e);
        setCoupons([]);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(p.category || 'General');
    return ['all', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    return products
      .filter((p) => p.active !== false)
      .filter((p) => selectedCategory === 'all' ? true : (p.category || 'General') === selectedCategory)
      .filter((p) => !isDressCategory(p.category))
      .filter((p) => {
        const s = search.trim().toLowerCase();
        if (!s) return true;
        return (p.name.toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s));
      });
  }, [products, selectedCategory, search]);

  const openProductModal = (p: StoreProduct) => {
    setSelected(p);
    setModalOpen(true);
  };

  const getVariantPricing = (p: StoreProduct) => {
    const base = Number(p.price || 0);
    const variants: { label: string; price: number }[] = [];
    if (Array.isArray(p.variantes) && p.variantes.length) {
      for (const v of p.variantes) variants.push({ label: String((v as any).nombre || (v as any).name || ''), price: Number((v as any).precio || (v as any).price || 0) });
    } else if (Array.isArray(p.variants) && p.variants.length) {
      for (const v of p.variants) {
        const price = v.price != null ? Number(v.price) : base + Number(v.priceDelta || 0);
        variants.push({ label: v.name, price });
      }
    }
    if (variants.length === 0) variants.push({ label: '', price: base });
    return variants;
  };

  const bestForProduct = (p: StoreProduct) => {
    const variants = getVariantPricing(p);
    let best = { coupon: null as DBCoupon | null, discount: 0, label: '' };
    for (const opt of variants) {
      const item = { id: String(p.id), name: p.name, type: 'store', price: opt.price, variantName: opt.label } as any;
      const r = bestCouponForItem(coupons, item);
      if (r.discount > best.discount) best = { coupon: r.coupon, discount: r.discount, label: '' };
    }
    return best;
  };

  const variantDiscountCount = (p: StoreProduct) => {
    const variants = getVariantPricing(p);
    let count = 0;
    for (const opt of variants) {
      const item = { id: String(p.id), name: p.name, type: 'store', price: opt.price, variantName: opt.label } as any;
      const r = bestCouponForItem(coupons, item);
      if (r.discount > 0) count++;
    }
    return count;
  };

  const discountBadgeText = (p: StoreProduct): string | null => {
    const b = bestForProduct(p);
    if (!b.coupon || b.discount <= 0) return null;
    const t = b.coupon.discountType;
    if (t === 'percentage') return `-${Number(b.coupon.discountValue || 0)}%`;
    if (t === 'full') return '-100%';
    return `-${formatPrice(b.discount)}`;
  };

  const handleAddFromModal = (payload: { id: string; name: string; priceNumber: number; image?: string; variantName?: string; customText?: string; customImageDataUrl?: string | null; customAudioDataUrl?: string | null; appliedCoupon?: { id: string; code: string; discount: number; discountType: 'percentage' | 'fixed' | 'full'; discountValue?: number }; }) => {
    console.log('StorePage handleAddFromModal received:', payload);
    if (payload.appliedCoupon) {
      console.log('StorePage appliedCoupon passed to cart payload:', payload.appliedCoupon);
    } else {
      console.log('StorePage no appliedCoupon in payload.');
    }
    const displayName = payload.variantName ? `${payload.name} — ${payload.variantName}` : payload.name;
    addToCart({
      id: payload.id,
      type: 'store',
      name: displayName,
      price: formatPrice(payload.priceNumber),
      duration: '',
      image: payload.image || ''
    });
  };

  return (
    <section className="pt-32 pb-16">
      <div className="container-custom">
        <div className="mb-8">
          <h1 className="section-title">Loja</h1>
          <p className="text-gray-600 mt-2">Produtos e serviços adicionais para complementar seu pacote.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-6">
          <div className="flex gap-2 items-center">
            <label className="text-sm">Categoria:</label>
            <select className="border px-2 py-1 text-sm" value={selectedCategory} onChange={(e)=>setSelectedCategory(e.target.value)}>
              {categories.map((c) => (<option key={c} value={c}>{c === 'all' ? 'Todas' : c}</option>))}
            </select>
          </div>
          <input
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="Buscar produtos..."
            className="border px-3 py-2 w-full md:w-64"
          />
        </div>


        {loading ? (
          <div className="text-gray-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-600">Nenhum produto disponível no momento.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
                <div className="relative">
                  <img loading="lazy" src={p.image_url} alt={p.name} className="w-full h-48 object-cover" />
                  {(() => { const b = bestForProduct(p); const dcount = variantDiscountCount(p); if (dcount > 1) {
                    return (<span className="absolute top-2 left-2 bg-green-600 text-white text-[11px] px-2 py-1 rounded">com desconto</span>);
                  }
                  const txt = discountBadgeText(p);
                  return txt ? (
                    <span className="absolute top-2 left-2 bg-green-600 text-white text-[11px] px-2 py-1 rounded">{txt}</span>
                  ) : null; })()}
                </div>
                <div className="p-4 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{p.name}</h3>
                    {((Array.isArray(p.variantes) && p.variantes.length > 0) || (Array.isArray(p.variants) && p.variants.length > 0)) ? null : (
                      <span className="text-primary font-bold">{formatPrice(p.price)}</span>
                    )}
                  </div>
                  {p.description ? (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{p.description}</p>
                  ) : null}
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded">{p.category || 'General'}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 mt-auto">
                    <button onClick={() => openProductModal(p)} className="flex-1 border-2 border-black bg-black text-white px-3 py-2 rounded-none hover:opacity-90">Ver opções</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(fromBooking && !hasStoreItems) && (
        <div className={`fixed bottom-0 inset-x-0 z-[60] transition-transform duration-300 ease-out ${showFinalizeBar ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="bg-black text-white">
            <div className="container-custom py-3 flex items-center justify-between gap-3">
              <div className="text-sm">Continuar sem comprar produtos da loja</div>
              <button
                onClick={() => navigate('/booking', { state: { skipStorePopup: true } })}
                className="px-4 py-2 rounded-none border-2 border-orange-500 bg-orange-500 text-white hover:bg-orange-600 hover:border-orange-600"
                aria-label="Finalizar e preencher o contrato"
              >
                Finalizar e preencher o contrato
              </button>
            </div>
          </div>
        </div>
      )}

      <AddToCartModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={selected as unknown as StoreProductType}
        onAdd={handleAddFromModal}
        coupons={coupons}
      />
    </section>
  );
};

export default StorePage;
