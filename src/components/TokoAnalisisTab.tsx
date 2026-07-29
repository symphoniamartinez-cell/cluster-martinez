import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TokoPenjualan, TokoBarang } from '@/types';
import { Package, TrendingUp } from 'lucide-react';

interface Props {
  penjualanList: TokoPenjualan[];
  barangList: TokoBarang[];
  filterMonth: number;
  filterYear: number;
}

export default function TokoAnalisisTab({ penjualanList, barangList, filterMonth, filterYear }: Props) {
  const { allItems, activeDays, avgDailyOmset, totalTerjual } = useMemo(() => {
    // 1. Calculate Active Days logic
    const now = new Date();
    const isCurrentMonth = now.getMonth() + 1 === filterMonth && now.getFullYear() === filterYear;
    const daysInMonth = new Date(filterYear, filterMonth, 0).getDate();
    
    let activeDays = isCurrentMonth ? now.getDate() : daysInMonth;

    if (penjualanList.length > 0) {
      const minTime = Math.min(...penjualanList.map(p => new Date(p.created_at || new Date()).getTime()));
      const globalStartDate = new Date(minTime);
      
      if (globalStartDate.getMonth() + 1 === filterMonth && globalStartDate.getFullYear() === filterYear) {
        // This is the first month the app was used!
        const endDay = isCurrentMonth ? now.getDate() : daysInMonth;
        activeDays = endDay - globalStartDate.getDate() + 1;
      }
    }
    
    activeDays = Math.max(1, activeDays);

    // 2. Filter data by selected month & year
    const filteredPenjualan = penjualanList.filter(p => {
      const d = new Date(p.created_at || new Date());
      return (d.getMonth() + 1) === filterMonth && d.getFullYear() === filterYear;
    });

    const qtyMap: Record<string, number> = {};
    let totalOmset = 0;
    let totalTerjual = 0;

    filteredPenjualan.forEach(p => {
      qtyMap[p.barang_id] = (qtyMap[p.barang_id] || 0) + p.jumlah_satuan_kecil;
      totalOmset += p.total_harga || 0;
      totalTerjual += p.jumlah_satuan_kecil;
    });

    const items = Object.entries(qtyMap).map(([barang_id, qty]) => {
      const b = barangList.find(x => x.id === barang_id);
      return {
        barang_id,
        nama: b ? b.nama_barang : 'Unknown',
        satuan_kecil: b ? b.satuan_kecil : 'Pcs',
        qty,
        runrate: qty / activeDays
      };
    }).sort((a, b) => b.qty - a.qty);

    return { allItems: items, activeDays, avgDailyOmset: totalOmset / activeDays, totalTerjual };
  }, [penjualanList, barangList, filterMonth, filterYear]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm p-6">
        <h3 className="font-bold text-base text-surface-900 dark:text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          Analisis Penjualan & Runrate (Bulan {filterMonth} / {filterYear})
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          <div className="bg-surface-50 dark:bg-surface-800/50 p-4 rounded-2xl border border-surface-200/50 dark:border-surface-700/50 flex flex-col gap-1">
            <span className="text-xs font-semibold text-surface-500">Total Barang Terjual</span>
            <span className="text-2xl font-black text-surface-900 dark:text-white">{totalTerjual} Item</span>
          </div>
          <div className="bg-surface-50 dark:bg-surface-800/50 p-4 rounded-2xl border border-surface-200/50 dark:border-surface-700/50 flex flex-col gap-1">
            <span className="text-xs font-semibold text-surface-500">Rata-Rata Omset Harian</span>
            <span className="text-2xl font-black text-surface-900 dark:text-white">
              Rp {Math.round(avgDailyOmset).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {allItems.length > 0 ? (
          <>
            <h4 className="text-sm font-bold text-surface-700 dark:text-surface-300 mb-4">Grafik Penjualan Seluruh Barang</h4>
            <div className="w-full h-72 mb-8 bg-surface-50 dark:bg-surface-800/20 rounded-xl p-4 border border-surface-100 dark:border-surface-800 overflow-x-auto no-scrollbar">
              <div style={{ minWidth: `${Math.max(allItems.length * 80, 100)}%`, height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allItems} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="nama" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} 
                  />
                  <Bar dataKey="qty" name="Kuantitas Terjual" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
            
            <h4 className="text-sm font-bold text-surface-700 dark:text-surface-300 mb-4">Rincian Runrate Seluruh Barang</h4>
            <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-50 dark:bg-surface-800 text-surface-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Nama Barang</th>
                    <th className="px-4 py-3 text-right">Total Terjual</th>
                    <th className="px-4 py-3 text-right">Runrate (per Hari)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {allItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-surface-400" />
                        {item.nama}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.qty} {item.satuan_kecil}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-400 font-bold">
                        {item.runrate.toFixed(2)} / hari
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-surface-500 border border-dashed border-surface-300 dark:border-surface-700 rounded-xl">
            Belum ada data penjualan di bulan ini.
          </div>
        )}
      </div>
    </div>
  );
}
