
-- Menghapus kupon dan booth untuk event lama agar tidak ada data yatim (orphan)
DELETE FROM public.kupons WHERE event_id != 'evt-1785228750854';
DELETE FROM public.tenant_booths WHERE event_id != 'evt-1785228750854';

-- Menghapus event-event lawas
DELETE FROM public.events WHERE id != 'evt-1785228750854';

