import React, { useEffect, useState } from 'react';
import AdminGuard from '../components/ui/AdminGuard';
import { db } from '../utils/firebaseClient';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Trash2, Plus, X } from 'lucide-react';

type TypeformCard = {
  id?: string;
  title?: string;
  description?: string;
  image_url?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export const TypeformAdminPanel: React.FC = () => {
  const [cards, setCards] = useState<TypeformCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TypeformCard | null>(null);
  const [form, setForm] = useState<{ title: string; description: string; image_url: string; active: boolean }>({ title: '', description: '', image_url: '', active: true });

  const showNotice = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 3000);
  };

  const fetchCards = async () => {
    setLoading(true);
    try {
      const col = collection(db, 'typeform_cards');
      let q: any = col;
      try { q = query(col, orderBy('created_at', 'desc')); } catch (_) { q = col; }
      const snap = await getDocs(q);
      const raw = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      // If there are no cards yet, seed from services list
      if (raw.length === 0) {
        try {
          const { services } = await import('./ServiceSelectionPage');
          const created: any[] = [];
          for (const s of services) {
            const docRef = await addDoc(collection(db, 'typeform_cards'), {
              title: s.title,
              description: s.description,
              image_url: '',
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              source_id: s.id,
            });
            created.push({ id: docRef.id, title: s.title, description: s.description });
          }
          showNotice(`${created.length} cards importadas desde servicios`, 'success');
          // refetch after seeding
          const snap2 = await getDocs(q);
          const raw2 = snap2.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setCards(raw2);
          return;
        } catch (err) {
          console.error('seed from services error', err);
        }
      }

      setCards(raw);
    } catch (e) {
      console.error('fetchCards error', e);
      setCards([]);
      showNotice('No se pudieron cargar las cards', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCards(); }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail || {};
      if (detail && detail.message) showNotice(detail.message, detail.type || 'success');
      if (detail && detail.refresh) fetchCards();
    };
    window.addEventListener('adminToast', handler as EventListener);
    return () => window.removeEventListener('adminToast', handler as EventListener);
  }, []);

  const openNew = () => {
    setEditingCard(null);
    setForm({ title: '', description: '', image_url: '', active: true });
    setEditorOpen(true);
  };

  const openEdit = (card: TypeformCard) => {
    setEditingCard(card);
    setForm({ title: String(card.title || ''), description: String(card.description || ''), image_url: String(card.image_url || ''), active: card.active === false ? false : true });
    setEditorOpen(true);
  };

  const saveCard = async () => {
    if (!form.title.trim()) { showNotice('El título es requerido', 'error'); return; }
    try {
      if (editingCard && editingCard.id) {
        await updateDoc(doc(db, 'typeform_cards', editingCard.id), {
          title: form.title,
          description: form.description,
          image_url: form.image_url,
          active: form.active,
          updated_at: new Date().toISOString(),
        });
        showNotice('Card actualizada', 'success');
      } else {
        await addDoc(collection(db, 'typeform_cards'), {
          title: form.title,
          description: form.description,
          image_url: form.image_url,
          active: form.active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        showNotice('Card creada', 'success');
      }
      setEditorOpen(false);
      fetchCards();
    } catch (e) {
      console.error('saveCard error', e);
      showNotice('No se pudo guardar la card', 'error');
    }
  };

  const toggleActive = async (card: TypeformCard) => {
    if (!card.id) return;
    try {
      await updateDoc(doc(db, 'typeform_cards', card.id), { active: card.active === false ? true : false, updated_at: new Date().toISOString() });
      showNotice('Estado actualizado', 'success');
      fetchCards();
    } catch (e) {
      console.error('toggleActive error', e);
      showNotice('No se pudo actualizar el estado', 'error');
    }
  };

  const deleteCard = async (cardId?: string) => {
    if (!cardId) return;
    try {
      await deleteDoc(doc(db, 'typeform_cards', cardId));
      showNotice('Card eliminada', 'success');
      fetchCards();
    } catch (e) {
      console.error('deleteCard error', e);
      showNotice('No se pudo eliminar la card', 'error');
    }
  };

  return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Typeform — Gestión de Cards</h1>
          <div className="flex items-center gap-2">
            <button onClick={openNew} className="px-4 py-2 border-2 border-black rounded-none bg-black text-white flex items-center gap-2"><Plus size={14} />Nuevo</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {loading ? (
            <div className="col-span-full p-6 bg-white border rounded">Cargando...</div>
          ) : cards.length === 0 ? (
            <div className="col-span-full p-6 bg-white border rounded">No hay cards aún.</div>
          ) : (
            cards.map(card => (
              <div key={card.id} className="bg-white rounded border border-gray-200 overflow-hidden flex flex-col">
                <div className="relative h-36 flex-shrink-0">
                  {card.image_url ? (
                    // eslint-disable-next-line jsx-a11y/img-redundant-alt
                    <img src={card.image_url} alt={card.title || 'imagen'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-500">Sin imagen</div>
                  )}
                  {card.active === false && <span className="absolute top-1 left-1 text-xs px-1 py-0.5 rounded bg-gray-200 text-gray-700">inactivo</span>}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold line-clamp-1">{card.title}</h3>
                    <span className="text-xs text-gray-600">{card.id}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{card.description}</p>
                  <div className="mt-auto flex items-center gap-2">
                    <button onClick={() => openEdit(card)} className="flex-1 border border-black px-2 py-1 rounded-none text-xs hover:bg-black hover:text-white">Editar</button>
                    <button onClick={() => toggleActive(card)} className={`flex-1 border px-2 py-1 rounded-none text-xs ${card.active === false ? 'bg-white text-black hover:bg-black hover:text-white' : 'bg-black text-white hover:opacity-90'}`}>{card.active === false ? 'Activar' : 'Desactivar'}</button>
                    <button onClick={() => deleteCard(card.id)} className="border border-black px-2 py-1 rounded text-xs hover:bg-black hover:text-white"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {editorOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center p-6">
            <div className="w-full max-w-2xl bg-white rounded shadow-lg overflow-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{editingCard ? 'Editar Card' : 'Nueva Card'}</h2>
                <button onClick={() => setEditorOpen(false)} className="p-1"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Título</label>
                  <input value={form.title} onChange={(e) => setForm(s => ({ ...s, title: e.target.value }))} className="w-full border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Descripción</label>
                  <textarea value={form.description} onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))} className="w-full border px-3 py-2 text-sm h-24" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">URL Imagen</label>
                  <input value={form.image_url} onChange={(e) => setForm(s => ({ ...s, image_url: e.target.value }))} className="w-full border px-3 py-2 text-sm" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm(s => ({ ...s, active: e.target.checked }))} /> Activa
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setEditorOpen(false)} className="px-4 py-2 border rounded-none">Cancelar</button>
                  <button onClick={saveCard} className="px-4 py-2 border-2 border-black rounded-none bg-black text-white">Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {notice && (
          <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 p-4 rounded-lg border text-sm shadow-lg transition-all ${notice.type==='success' ? 'border-green-200 bg-green-50 text-green-700' : notice.type==='error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
            {notice.text}
          </div>
        )}
      </div>
  );
};

const TypeformAdminPage: React.FC = () => (
  <AdminGuard>
    <TypeformAdminPanel />
  </AdminGuard>
);

export default TypeformAdminPage;
