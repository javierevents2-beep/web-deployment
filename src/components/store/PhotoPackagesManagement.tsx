import { Plus, Edit, Trash2, Eye, EyeOff, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DBPackage, fetchPackages, createPackage, updatePackage, deletePackage } from '../../utils/packagesService';
import PackageEditorModal from '../admin/PackageEditorModal';
import { eventPackages } from '../../data/eventsData';
import { sessionPackages } from '../../data/sessionsData';
import { maternityPackages } from '../../data/maternityData';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../utils/firebaseClient';

function parsePrice(value: string): number {
  const n = Number(String(value).replace(/[^0-9,\.]/g, '').replace('.', '').replace(',', '.'));
  return isFinite(n) ? n : 0;
}

const PhotoPackagesManagement = () => {
  const getCachedPackages = () => {
    try {
      const cached = localStorage.getItem('packages_management_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  const [packages, setPackages] = useState(() => getCachedPackages());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('packages_management_cache', JSON.stringify(packages));
  }, [packages]);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<DBPackage | null>(null);
  const [storeProducts, setStoreProducts] = useState<Record<string, { name: string; price: number }>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newError, setNewError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return {
      portrait: packages.filter((p: DBPackage) => p.type === 'portrait'),
      maternity: packages.filter((p: DBPackage) => p.type === 'maternity'),
      events: packages.filter((p: DBPackage) => p.type === 'events'),
    };
  }, [packages]);

  const load = async () => {
    try {
      setLoading(true);
      const all = await fetchPackages();
      setPackages(all);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los paquetes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const fetchStoreProducts = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const map: Record<string, { name: string; price: number }> = {};
        snap.docs.forEach(d => { const data = d.data() as any; map[d.id] = { name: data.name || 'Producto', price: Number(data.price||0) }; });
        setStoreProducts(map);
      } catch {
        setStoreProducts({});
      }
    };
    fetchStoreProducts();
  }, []);


  const handleCreate = async () => {
    setNewTitle('');
    setNewError(null);
    setNewOpen(true);
  };

  const handleToggle = async (p: DBPackage) => {
    const newActive = !(p as any).active;
    await updatePackage(p.id, { active: newActive } as any);
    await load();
  };




  const handleDelete = async (p: DBPackage) => {
    if (!confirm(`Eliminar paquete "${p.title}"?`)) return;
    await deletePackage(p.id);
    await load();
  };

  const importFromDataCore = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'packages'));
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'packages', d.id))));
      const toCreate: Array<Omit<DBPackage, 'id' | 'created_at'>> = [] as any;
      for (const s of sessionPackages) {
        toCreate.push({
          type: 'portrait',
          title: s.title,
          price: parsePrice(s.price),
          duration: s.duration,
          description: s.description,
          features: s.features,
          image_url: s.image,
          category: 'portrait',
        } as any);
      }
      for (const m of maternityPackages) {
        toCreate.push({
          type: 'maternity',
          title: m.title,
          price: parsePrice(m.price),
          duration: m.duration,
          description: m.description,
          features: m.features,
          image_url: m.image,
          category: 'maternity',
        } as any);
      }
      for (const e of eventPackages) {
        const cat = e.id.split('-')[0];
        toCreate.push({
          type: 'events',
          title: e.title,
          price: parsePrice(e.price),
          duration: e.duration,
          description: e.description,
          features: e.features,
          image_url: e.image,
          category: cat,
        } as any);
      }
      for (const c of toCreate) {
        await createPackage({ ...c });
      }
      await load();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromData = async () => {
    if (!confirm('Esto eliminará todos los paquetes actuales y los reemplazará por los paquetes predefinidos. ¿Continuar?')) return;
    const ok = await importFromDataCore();
    if (ok) {
      window.dispatchEvent(new CustomEvent('adminToast', { detail: { message: 'Paquetes importados correctamente', type: 'success', refresh: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('adminToast', { detail: { message: 'Error al importar paquetes', type: 'error' } }));
    }
  };

  const continueCreateWithTitle = async (title: string) => {
    setLoading(true);
    try {
      const id = await createPackage({
        type: 'portrait',
        title,
        price: 0,
        duration: '',
        description: '',
        features: [],
        image_url: '',
        active: true,
      });
      const all = await fetchPackages();
      setPackages(all);
      const created = all.find(p => p.id === id) || null;
      setEditing(created);
      setEditorOpen(true);
    } catch (e: any) {
      setError(e?.message || 'Error creando paquete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div></div>
        <div className="flex items-center gap-2">
          <button onClick={handleCreate} className="px-4 py-2 border-2 border-black text-black rounded-none hover:bg-black hover:text-white flex items-center gap-2"><Plus size={16}/>Nuevo</button>
        </div>
      </div>

      {success && <div className="mb-4 p-3 rounded border border-green-200 bg-green-50 text-green-700 text-sm">{success}</div>}

      {loading && <div className="text-gray-600">Cargando...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {(['portrait','maternity','events'] as const).map((type) => (
        <div key={type} className="mb-8">
          <h3 className="text-lg font-semibold mb-3 capitalize">{type === 'portrait' ? 'Retratos' : type === 'maternity' ? 'Gestantes' : 'Eventos'}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 px-6">
            {grouped[type].map((p: DBPackage) => (
              <div key={p.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden aspect-square flex flex-col">
                <div className="relative flex-shrink-0 h-1/3">
                  <img loading="lazy" src={p.image_url} alt={p.title} className="w-full h-full object-cover" data-pkg-id={p.id} />
                  {(p as any).active === false && (
                    <span className="absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">inactivo</span>
                  )}
                </div>
                <div className="p-2 flex flex-col flex-1 overflow-hidden justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-semibold text-xs line-clamp-1">{p.title}</h4>
                      <span className="text-primary font-bold text-xs flex-shrink-0">R$ {Number(p.price).toFixed(0)}</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5 line-clamp-1">{p.description}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(p); setEditorOpen(true); }} className="flex-1 border border-black text-black px-1 py-1 rounded-none hover:bg-black hover:text-white flex items-center justify-center gap-0.5 text-xs"><Edit size={12}/>Editar</button>
                    <button onClick={() => handleToggle(p)} className={`flex-1 border border-black px-1 py-1 rounded-none flex items-center justify-center gap-0.5 text-xs ${
                      (p as any).active === false ? 'bg-white text-black hover:bg-black hover:text-white' : 'bg-black text-white hover:opacity-90'
                    }`}>{(p as any).active === false ? (<Eye size={12}/>) : (<EyeOff size={12}/>)}</button>
                    <button onClick={() => handleDelete(p)} className="border border-black text-black px-1 py-1 rounded hover:bg-black hover:text-white flex items-center justify-center"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <PackageEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} pkg={editing} onSaved={() => { setSuccess('Datos guardados correctamente'); load(); setTimeout(()=>setSuccess(null), 2500); }} />

      {newOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nuevo paquete</h3>
              <button onClick={() => setNewOpen(false)} className="p-1 border rounded">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm mb-1">Nombre del paquete</label>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => { setNewTitle(e.target.value); if (newError) setNewError(null); }}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Ej.: Sessão Premium"
                />
                {newError && <div className="text-xs text-red-600 mt-1">{newError}</div>}
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button onClick={() => setNewOpen(false)} className="px-4 py-2 border rounded">Cancelar</button>
              <button
                onClick={async () => {
                  const t = (newTitle || '').trim();
                  if (!t) { setNewError('Ingresa un nombre'); return; }
                  setNewOpen(false);
                  await continueCreateWithTitle(t);
                  window.dispatchEvent(new CustomEvent('adminToast', { detail: { message: 'Paquete creado', type: 'success', refresh: true } }));
                }}
                className="px-4 py-2 bg-black text-white rounded hover:opacity-90"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoPackagesManagement;
