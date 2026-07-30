'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, PlusCircle, Check } from 'lucide-react';
import { 
  getEventsFromStorage, 
  addManualKupon,
  syncEventDataFromCloud 
} from '@/lib/event-store';
import type { EventAcara } from '@/types';

function TambahKuponForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEventId = searchParams.get('eventId');

  const [events, setEvents] = useState<EventAcara[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [manualHouse, setManualHouse] = useState('');
  const [manualCounts, setManualCounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };


  useEffect(() => {
    const loadData = async () => {
      const allEvents = getEventsFromStorage();
      setEvents(allEvents);
      
      if (defaultEventId && allEvents.some(e => e.id === defaultEventId)) {
        setSelectedEventId(defaultEventId);
      } else if (allEvents.length > 0) {
        setSelectedEventId(allEvents[0].id);
      }
    };
    loadData();
  }, [defaultEventId]);

  const handleAddManualKupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHouse.trim()) {
      alert('Nomor / Alamat Rumah Wajib Diisi!');
      return;
    }

    const countsToPass = Object.keys(manualCounts).map(categoryId => ({
      categoryId,
      count: manualCounts[categoryId]
    })).filter(c => c.count > 0);

    if (countsToPass.length === 0) {
      alert('Pilih minimal 1 kupon untuk ditambahkan!');
      return;
    }

    if (!selectedEventId) {
      alert('Pilih Event terlebih dahulu!');
      return;
    }

    setIsSubmitting(true);
    const res = await addManualKupon(selectedEventId, manualHouse.trim(), countsToPass);
    setIsSubmitting(false);

    if (res.cloudOk === false) {
      showToast(`⚠️ ${res.newKupons.length} Kupon dibuat di lokal, tapi GAGAL ke Cloud: ${res.error}`);
    } else {
      showToast(`✅ ${res.newKupons.length} Kupon Manual berhasil dibuat untuk ${manualHouse}!`);
    }

    router.back();
  };

  const currentEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-surface-600 dark:text-surface-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Tambah Kupon Manual</h1>
          <p className="text-sm text-surface-500">
            Gunakan untuk menambahkan kupon secara manual jika ada kesalahan data iuran warga.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleAddManualKupon} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-surface-900 dark:text-white">Event Acara Tujuan</label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setManualCounts({});
              }}
              className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-bold uppercase focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="" disabled>-- Pilih Event --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.nama_event}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-surface-900 dark:text-white">Nomor / Alamat Rumah Warga *</label>
            <input
              type="text"
              value={manualHouse}
              onChange={(e) => setManualHouse(e.target.value)}
              placeholder="CONTOH: MTNU3/2 ATAU MTNR/11"
              required
              className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-bold uppercase font-mono tracking-wider focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-surface-900 dark:text-white border-b border-surface-200 dark:border-surface-700 pb-2">
              Pilih Kategori Kupon & Jumlah
            </label>
            
            {currentEvent ? (
              currentEvent.rules?.categories?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentEvent.rules.categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between gap-4 p-4 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl">
                      <span className="text-sm font-bold text-surface-900 dark:text-white">{cat.nama_kategori}</span>
                      <div className="flex items-center gap-3 bg-white dark:bg-surface-900 p-1.5 rounded-xl border border-surface-200 dark:border-surface-700">
                        <button 
                          type="button"
                          onClick={() => setManualCounts(prev => ({ ...prev, [cat.id]: Math.max(0, (prev[cat.id] || 0) - 1) }))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 font-bold"
                        >-</button>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={manualCounts[cat.id] || 0}
                          onChange={(e) => setManualCounts(prev => ({ ...prev, [cat.id]: parseInt(e.target.value) || 0 }))}
                          className="w-12 text-center bg-transparent text-sm font-bold font-mono outline-none"
                        />
                        <button 
                          type="button"
                          onClick={() => setManualCounts(prev => ({ ...prev, [cat.id]: (prev[cat.id] || 0) + 1 }))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 font-bold"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-surface-500 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
                  Event ini tidak memiliki kategori kupon.
                </div>
              )
            ) : (
              <div className="p-4 text-center text-sm text-surface-500 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
                Pilih event terlebih dahulu untuk melihat daftar kupon.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-surface-100 dark:border-surface-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Kupon Manual'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TambahKuponPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-surface-500">Memuat formulir...</div>}>
      <TambahKuponForm />
    </Suspense>
  );
}
