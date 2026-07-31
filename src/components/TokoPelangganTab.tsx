import React, { useState } from 'react';
import { TokoPelanggan, TokoTransaksiPelanggan } from '@/types';
import { 
  Users, Plus, Wallet, CreditCard, ChevronDown, 
  Search, History, ArrowUpRight, ArrowDownLeft, X
} from 'lucide-react';
import { saveTokoPelanggan, submitTransaksiPelanggan, updateTokoPelanggan, deleteTokoPelanggan, getClientUserName } from '@/lib/toko-store';

interface Props {
  pelangganList: TokoPelanggan[];
  transaksiList: TokoTransaksiPelanggan[];
  onDataChange: () => void;
}

export default function TokoPelangganTab({ pelangganList, transaksiList, onDataChange }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModalAdd, setShowModalAdd] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [showModalDelete, setShowModalDelete] = useState(false);
  const [showModalTopUp, setShowModalTopUp] = useState(false);
  const [showModalBayar, setShowModalBayar] = useState(false);
  const [selectedPelangganId, setSelectedPelangganId] = useState('');
  
  const [formAdd, setFormAdd] = useState({ nama: '', no_hp: '', alamat: '' });
  const [formEdit, setFormEdit] = useState({ nama: '', no_hp: '', alamat: '', saldo_titipan: 0, total_hutang: 0 });
  const [formTopUp, setFormTopUp] = useState({ nominal: '', keterangan: '' });
  const [formBayar, setFormBayar] = useState({ nominal: '', keterangan: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPelanggan = pelangganList.filter(p => 
    p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.no_hp.includes(searchTerm)
  );

  const handleSavePelanggan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newPelanggan: TokoPelanggan = {
      id: crypto.randomUUID(),
      nama: formAdd.nama,
      no_hp: formAdd.no_hp,
      alamat: formAdd.alamat,
      saldo_titipan: 0,
      total_hutang: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const res = await saveTokoPelanggan(newPelanggan);
    if (res.success) {
      setShowModalAdd(false);
      setFormAdd({ nama: '', no_hp: '', alamat: '' });
      onDataChange();
    } else {
      alert("Gagal menyimpan: " + res.error);
    }
    setIsSubmitting(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await updateTokoPelanggan(selectedPelangganId, formEdit);
    if (res.success) {
      setShowModalEdit(false);
      onDataChange();
    } else {
      alert("Gagal update: " + res.error);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const res = await deleteTokoPelanggan(selectedPelangganId);
    if (res.success) {
      setShowModalDelete(false);
      onDataChange();
    } else {
      alert("Gagal hapus: " + res.error);
    }
    setIsSubmitting(false);
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPelangganId) return alert('Pilih pelanggan dulu');
    setIsSubmitting(true);
    const user = getClientUserName('Admin');
    const nominal = parseInt(formTopUp.nominal.replace(/\D/g, ''), 10) || 0;
    
    if (nominal <= 0) {
      alert("Nominal tidak valid");
      setIsSubmitting(false);
      return;
    }

    const res = await submitTransaksiPelanggan(selectedPelangganId, 'TOPUP_SALDO', nominal, formTopUp.keterangan || 'Top-Up Saldo', user);
    if (res.success) {
      setShowModalTopUp(false);
      setFormTopUp({ nominal: '', keterangan: '' });
      onDataChange();
    } else {
      alert("Gagal topup: " + res.error);
    }
    setIsSubmitting(false);
  };

  const handleBayarHutang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPelangganId) return alert('Pilih pelanggan dulu');
    setIsSubmitting(true);
    const user = getClientUserName('Admin');
    const nominal = parseInt(formBayar.nominal.replace(/\D/g, ''), 10) || 0;
    
    if (nominal <= 0) {
      alert("Nominal tidak valid");
      setIsSubmitting(false);
      return;
    }

    const res = await submitTransaksiPelanggan(selectedPelangganId, 'BAYAR_HUTANG', nominal, formBayar.keterangan || 'Pembayaran Hutang', user);
    if (res.success) {
      setShowModalBayar(false);
      setFormBayar({ nominal: '', keterangan: '' });
      onDataChange();
    } else {
      alert("Gagal bayar: " + res.error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl shadow-purple-500/20">
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-2 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Master Pelanggan
          </h2>
          <p className="text-white/80 text-sm max-w-xl leading-relaxed">
            Kelola data pelanggan tetap, saldo titipan (deposit), dan piutang/hutang pelanggan.
          </p>
        </div>
        <div className="flex-shrink-0 flex flex-wrap gap-3">
          <button
            onClick={() => setShowModalAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-purple-600 font-bold rounded-xl shadow-lg hover:bg-purple-50 transition-all text-xs"
          >
            <Plus className="w-4 h-4" /> Pelanggan Baru
          </button>
          <button
            onClick={() => setShowModalTopUp(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all text-xs border border-white/20"
          >
            <Wallet className="w-4 h-4" /> Top-Up Saldo
          </button>
          <button
            onClick={() => setShowModalBayar(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-all text-xs border border-white/20"
          >
            <CreditCard className="w-4 h-4" /> Bayar Hutang
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
            Daftar Pelanggan
            <span className="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-[10px] px-2 py-0.5 rounded-full">
              {pelangganList.length} Total
            </span>
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-surface-400" />
            <input
              type="text"
              placeholder="Cari nama / no HP..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-surface-500 uppercase bg-surface-50/50 dark:bg-surface-800/50 border-y border-surface-200 dark:border-surface-700">
              <tr>
                <th className="px-5 py-3 font-bold">Nama Pelanggan</th>
                <th className="px-5 py-3 font-bold">No. HP</th>
                <th className="px-5 py-3 font-bold text-right">Saldo Deposit</th>
                <th className="px-5 py-3 font-bold text-right">Total Hutang</th>
                <th className="px-5 py-3 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700/50">
              {filteredPelanggan.map(p => (
                <tr key={p.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-surface-900 dark:text-white">{p.nama}</td>
                  <td className="px-5 py-4 text-surface-600 dark:text-surface-300 font-mono">{p.no_hp || '-'}</td>
                  <td className="px-5 py-4 font-bold text-right text-emerald-600 dark:text-emerald-400">
                    Rp {p.saldo_titipan.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-4 font-bold text-right text-rose-600 dark:text-rose-400">
                    Rp {p.total_hutang.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => {
                          setSelectedPelangganId(p.id);
                          setShowModalTopUp(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:brightness-110 rounded-lg text-[10px] font-semibold transition-colors"
                      >
                        Topup
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedPelangganId(p.id);
                          setShowModalBayar(true);
                        }}
                        className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:brightness-110 rounded-lg text-[10px] font-semibold transition-colors"
                      >
                        Bayar
                      </button>
                      <div className="w-px h-4 bg-surface-200 dark:bg-surface-700 mx-1"></div>
                      <button 
                        onClick={() => {
                          setSelectedPelangganId(p.id);
                          setFormEdit({
                            nama: p.nama,
                            no_hp: p.no_hp || '',
                            alamat: p.alamat || '',
                            saldo_titipan: p.saldo_titipan,
                            total_hutang: p.total_hutang
                          });
                          setShowModalEdit(true);
                        }}
                        className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:brightness-110 rounded-lg text-[10px] font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedPelangganId(p.id);
                          setShowModalDelete(true);
                        }}
                        className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:brightness-110 rounded-lg text-[10px] font-semibold transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPelanggan.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-surface-400">
                    Belum ada data pelanggan yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}
      {showModalAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex justify-between items-center">
              <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" /> Tambah Pelanggan Baru
              </h3>
              <button onClick={() => setShowModalAdd(false)} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <form onSubmit={handleSavePelanggan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Nama Lengkap</label>
                <input required type="text" value={formAdd.nama} onChange={e => setFormAdd({...formAdd, nama: e.target.value})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" placeholder="Nama..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">No. HP (Opsional)</label>
                <input type="text" value={formAdd.no_hp} onChange={e => setFormAdd({...formAdd, no_hp: e.target.value})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" placeholder="08..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Alamat (Opsional)</label>
                <textarea value={formAdd.alamat} onChange={e => setFormAdd({...formAdd, alamat: e.target.value})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" rows={2} placeholder="Alamat singkat..." />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModalAdd(false)} className="flex-1 py-2.5 text-surface-600 bg-surface-100 rounded-xl font-bold text-sm">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 text-white bg-purple-600 rounded-xl font-bold text-sm">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex justify-between items-center">
              <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Edit Pelanggan
              </h3>
              <button onClick={() => setShowModalEdit(false)} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Nama Lengkap</label>
                <input required type="text" value={formEdit.nama} onChange={e => setFormEdit({...formEdit, nama: e.target.value})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" placeholder="Nama..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">No. HP (Opsional)</label>
                <input type="text" value={formEdit.no_hp} onChange={e => setFormEdit({...formEdit, no_hp: e.target.value})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" placeholder="08..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Alamat (Opsional)</label>
                <textarea value={formEdit.alamat} onChange={e => setFormEdit({...formEdit, alamat: e.target.value})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" rows={2} placeholder="Alamat singkat..." />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Saldo Manual (Rp)</label>
                  <input type="number" required min="0" value={formEdit.saldo_titipan} onChange={e => setFormEdit({...formEdit, saldo_titipan: parseInt(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-mono text-emerald-600 font-bold" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Hutang Manual (Rp)</label>
                  <input type="number" required min="0" value={formEdit.total_hutang} onChange={e => setFormEdit({...formEdit, total_hutang: parseInt(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-mono text-rose-600 font-bold" />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModalEdit(false)} className="flex-1 py-2.5 text-surface-600 bg-surface-100 rounded-xl font-bold text-sm">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 text-white bg-blue-600 rounded-xl font-bold text-sm">{isSubmitting ? 'Menyimpan...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg text-surface-900 dark:text-white mb-2">Hapus Pelanggan?</h3>
            <p className="text-sm text-surface-500 mb-6">
              Data pelanggan dan seluruh riwayat transaksinya akan terhapus dan tidak bisa dikembalikan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowModalDelete(false)} className="flex-1 py-2.5 text-surface-600 bg-surface-100 rounded-xl font-bold text-sm">Batal</button>
              <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 py-2.5 text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-bold text-sm transition-colors">{isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}

      {showModalTopUp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/10">
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Top-Up Saldo Pelanggan
              </h3>
              <button onClick={() => setShowModalTopUp(false)} className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-xl transition-colors">
                <X className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
            <form onSubmit={handleTopUp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Pilih Pelanggan</label>
                <select required value={selectedPelangganId} onChange={e => setSelectedPelangganId(e.target.value)} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm">
                  <option value="">-- Pilih --</option>
                  {pelangganList.map(p => <option key={p.id} value={p.id}>{p.nama} (Saldo: Rp {p.saldo_titipan.toLocaleString('id-ID')})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Nominal Top-Up (Rp)</label>
                <input required type="text" value={formTopUp.nominal} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormTopUp({...formTopUp, nominal: val ? Number(val).toLocaleString('id-ID') : ''});
                }} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-bold text-emerald-600 text-lg text-center" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Keterangan (Opsional)</label>
                <input type="text" value={formTopUp.keterangan} onChange={e => setFormTopUp({...formTopUp, keterangan: e.target.value})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" placeholder="Transfer BCA / Titip Tunai..." />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModalTopUp(false)} className="flex-1 py-2.5 text-surface-600 bg-surface-100 rounded-xl font-bold text-sm">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 text-white bg-emerald-600 rounded-xl font-bold text-sm">{isSubmitting ? 'Proses...' : 'Proses Top-Up'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalBayar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex justify-between items-center bg-amber-50 dark:bg-amber-900/10">
              <h3 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Bayar Hutang Pelanggan
              </h3>
              <button onClick={() => setShowModalBayar(false)} className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded-xl transition-colors">
                <X className="w-4 h-4 text-amber-600" />
              </button>
            </div>
            <form onSubmit={handleBayarHutang} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Pilih Pelanggan</label>
                <select required value={selectedPelangganId} onChange={e => setSelectedPelangganId(e.target.value)} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm">
                  <option value="">-- Pilih --</option>
                  {pelangganList.filter(p => p.total_hutang > 0).map(p => <option key={p.id} value={p.id}>{p.nama} (Hutang: Rp {p.total_hutang.toLocaleString('id-ID')})</option>)}
                </select>
                {selectedPelangganId && pelangganList.find(p => p.id === selectedPelangganId)?.total_hutang === 0 && (
                  <p className="text-[10px] text-emerald-500 mt-1">Pelanggan ini tidak memiliki hutang.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Nominal Pembayaran (Rp)</label>
                <input required type="text" value={formBayar.nominal} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormBayar({...formBayar, nominal: val ? Number(val).toLocaleString('id-ID') : ''});
                }} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-bold text-amber-600 text-lg text-center" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1">Keterangan (Opsional)</label>
                <input type="text" value={formBayar.keterangan} onChange={e => setFormBayar({...formBayar, keterangan: e.target.value})} className="w-full px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm" placeholder="Tunai / Cicilan..." />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModalBayar(false)} className="flex-1 py-2.5 text-surface-600 bg-surface-100 rounded-xl font-bold text-sm">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 text-white bg-amber-600 rounded-xl font-bold text-sm">{isSubmitting ? 'Proses...' : 'Proses Pembayaran'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
