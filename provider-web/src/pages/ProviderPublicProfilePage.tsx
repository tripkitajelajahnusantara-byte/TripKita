import { useNavigation } from '../context/NavigationContext';
import { useApiData } from '../utils/useApiData';
import { getTripImage } from '../utils/tripImages';
import { formatRupiah } from '../utils/payment';

interface ProviderPackage {
  id: number; providerId: number; name: string; destination: string; status: string;
  price: number; image?: string; images?: string; category: string;
}

export const ProviderPublicProfilePage = () => {
  const { selectedProviderId, setSelectedPackageForDetail, navigateTo } = useNavigation();
  const { data, loading, error: loadError } = useApiData<ProviderPackage[]>(selectedProviderId ? '/public/packages' : null);
  const packages = (data || []).filter(pkg => pkg.providerId === selectedProviderId && pkg.status === 'Aktif');
  const error = selectedProviderId ? loadError : 'Pilih mitra dari halaman detail paket.';
  return () => { active = false; };
  }, [selectedProviderId]);
  return (
    <main className="container" style={{ padding: '40px 20px 80px' }}>
      <button onClick={() => navigateTo('cari-trip')}>Kembali ke daftar trip</button>
      <h1>Paket Wisata Mitra</h1>
      {loading ? <p>Memuat paket...</p> : error ? <p role="alert">{error}</p> : packages.length === 0 ? <p>Belum ada paket aktif dari mitra ini.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {packages.map(pkg => <article key={pkg.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
            <img src={getTripImage(pkg.id, pkg.name, pkg.category, pkg.images || pkg.image)} alt={pkg.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
            <div style={{ padding: '20px' }}><h2>{pkg.name}</h2><p>{pkg.destination}</p><p>{formatRupiah(pkg.price)} / orang</p>
              <button onClick={() => { setSelectedPackageForDetail(pkg); navigateTo('paket-detail'); }}>Lihat detail</button>
            </div>
          </article>)}
        </div>
      )}
    </main>
  );
};
