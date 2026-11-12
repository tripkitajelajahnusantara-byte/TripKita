-- Seed 10 berita dan 10 cerita untuk halaman Berita TemenTrip.
--
-- Cara pakai (Supabase SQL Editor atau psql):
-- 1. Pastikan migrasi 023_news.sql dan 024_news_categories_highlights_comments.sql
--    sudah dijalankan dan akun admin sudah ada (lihat create_default_admin.sql).
-- 2. Jalankan seluruh script sekaligus.
--
-- Aman dijalankan ulang: artikel dengan judul yang sudah ada dilewati, dan susunan
-- Berita Utama/Pilihan Redaksi hanya diisi bila admin belum pernah menyusunnya.
-- Berita berisi informasi destinasi, kuliner, budaya, dan tips; cerita berisi
-- legenda dan kisah yang hidup di masyarakat. Foto sampul berasal dari Wikimedia
-- Commons dengan lisensi CC0/CC BY/CC BY-SA; nama pembuat dan lisensinya dicantumkan
-- di cover_source sesuai syarat lisensi. Semua artikel langsung berstatus Terbit.

BEGIN;

DO $seed$
DECLARE
    v_author BIGINT;
BEGIN
    IF to_regclass('public.news_placements') IS NULL
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'category') THEN
        RAISE EXCEPTION 'Tabel berita belum lengkap. Jalankan migrasi 023 dan 024 terlebih dahulu.';
    END IF;

    SELECT id INTO v_author FROM providers WHERE role = 'ADMIN' AND deleted_at IS NULL ORDER BY id LIMIT 1;
    IF v_author IS NULL THEN
        RAISE EXCEPTION 'Akun admin belum ada. Jalankan create_default_admin.sql terlebih dahulu.';
    END IF;

    INSERT INTO news (title, category, excerpt, cover_image, cover_caption, cover_source, content,
                      status, published_at, author_id, created_at, updated_at)
    SELECT s.title, s.category, s.excerpt, s.cover_image, s.cover_caption, s.cover_source, s.content,
           'PUBLISHED', now() - s.age, v_author, now() - s.age, now() - s.age
    FROM (VALUES
        -- Berita
        ('Raja Ampat, Surga Bawah Laut di Ujung Timur Indonesia',
         'destinasi',
         'Raja Ampat di Provinsi Papua Barat Daya dikenal sebagai salah satu kawasan dengan keanekaragaman hayati laut tertinggi di dunia. Ratusan jenis karang dan ribuan spesies ikan hidup…',
         '/news-covers/raja-ampat.webp',
         'Gugusan pulau karst Piaynemo di Raja Ampat, Papua Barat Daya.',
         'Peter Harris/Wikimedia Commons, CC0',
         '<p>Raja Ampat di Provinsi Papua Barat Daya dikenal sebagai salah satu kawasan dengan keanekaragaman hayati laut tertinggi di dunia. Ratusan jenis karang dan ribuan spesies ikan hidup di perairannya, menjadikannya incaran penyelam dari berbagai negara.</p>
<h2>Spot yang wajib dikunjungi</h2>
<ul><li><strong>Piaynemo</strong>: gugusan pulau karst yang paling sering muncul di foto Raja Ampat. Pengunjung menaiki ratusan anak tangga untuk sampai ke gardu pandang.</li><li><strong>Wayag</strong>: lanskap pulau karst yang lebih luas, dicapai dengan perjalanan kapal yang cukup panjang.</li><li><strong>Pasir Timbul</strong>: gundukan pasir putih yang muncul saat air laut surut.</li><li><strong>Kampung Arborek</strong>: desa wisata dengan dermaga yang dikelilingi ikan dan terumbu karang.</li></ul>
<h2>Waktu terbaik berkunjung</h2>
<p>Banyak operator wisata menyarankan periode Oktober hingga April, saat laut umumnya lebih tenang. Namun cuaca bisa berubah sewaktu-waktu, jadi selalu ikuti arahan pemandu dan nakhoda kapal.</p>
<h2>Siapkan sebelum berangkat</h2>
<p>Perjalanan biasanya dimulai dari Kota Sorong, lalu dilanjutkan dengan kapal cepat ke Waisai. Wisatawan juga perlu membayar biaya konservasi kawasan. Karena jarak antarpulau cukup jauh, ikut open trip atau paket bersama pemandu lokal membuat perjalanan lebih hemat dan teratur.</p>',
         interval '3 hours'),
        ('Berburu Matahari Terbit di Bromo: Waktu Terbaik dan Tips Agar Nyaman',
         'destinasi',
         'Gunung Bromo di kawasan Taman Nasional Bromo Tengger Semeru, Jawa Timur, menjadi destinasi favorit untuk menikmati matahari terbit. Dari titik pandang di ketinggian, pengunjung…',
         '/news-covers/bromo.webp',
         'Gunung Bromo dan Gunung Batok saat matahari terbit, dengan Semeru di latar belakang.',
         'Thomas Hirsch/Wikimedia Commons, CC BY-SA 3.0',
         '<p>Gunung Bromo di kawasan Taman Nasional Bromo Tengger Semeru, Jawa Timur, menjadi destinasi favorit untuk menikmati matahari terbit. Dari titik pandang di ketinggian, pengunjung bisa melihat kaldera Bromo, Gunung Batok, dan puncak Semeru yang mengepulkan asap di kejauhan.</p>
<h2>Datang sebelum subuh</h2>
<p>Agar kebagian tempat terbaik di titik pandang seperti Penanjakan, wisatawan umumnya berangkat dini hari dari Cemoro Lawang, Tosari, atau Wonokitri. Jip sewaan menjadi pilihan paling praktis untuk melintasi lautan pasir.</p>
<h2>Tips agar tetap nyaman</h2>
<ul><li>Bawa jaket tebal, sarung tangan, dan penutup kepala. Suhu dini hari bisa sangat dingin.</li><li>Gunakan masker untuk melindungi diri dari debu pasir saat menuju kawah.</li><li>Cek status aktivitas gunung dan pengumuman resmi taman nasional sebelum berangkat.</li><li>Pesan tiket masuk dan jip lebih awal, terutama saat akhir pekan dan musim liburan.</li></ul>
<p>Setelah matahari terbit, perjalanan biasanya berlanjut ke kawah Bromo, Pasir Berbisik, dan Bukit Teletubbies. Satu hari penuh sudah cukup untuk menikmati semuanya.</p>',
         interval '37 hours'),
        ('Labuan Bajo dan Pulau Padar, Gerbang Petualangan di Taman Nasional Komodo',
         'destinasi',
         'Labuan Bajo di Kabupaten Manggarai Barat, Nusa Tenggara Timur, adalah pintu masuk menuju Taman Nasional Komodo. Dari kota pelabuhan ini, wisatawan berlayar mengunjungi pulau-pulau…',
         '/news-covers/padar.webp',
         'Panorama teluk dari puncak Pulau Padar, Taman Nasional Komodo.',
         'Jakub Hałun/Wikimedia Commons, CC BY 4.0',
         '<p>Labuan Bajo di Kabupaten Manggarai Barat, Nusa Tenggara Timur, adalah pintu masuk menuju Taman Nasional Komodo. Dari kota pelabuhan ini, wisatawan berlayar mengunjungi pulau-pulau dengan lanskap savana, pantai berpasir merah muda, dan tentu saja komodo di habitat aslinya.</p>
<h2>Pulau Padar</h2>
<p>Pulau Padar terkenal dengan panorama teluk berlekuk yang terlihat dari puncaknya. Pendakian pendek melalui jalur bertangga cukup untuk sampai ke titik pandang. Waktu terbaik mendaki adalah pagi hari atau menjelang matahari terbenam agar tidak terlalu panas.</p>
<h2>Destinasi lain dalam satu perjalanan</h2>
<ul><li><strong>Pulau Komodo dan Pulau Rinca</strong>: melihat komodo bersama ranger taman nasional.</li><li><strong>Pink Beach</strong>: pantai dengan pasir berwarna merah muda.</li><li><strong>Manta Point</strong>: spot snorkeling untuk melihat pari manta.</li><li><strong>Pulau Kanawa</strong>: pantai tenang dengan air jernih untuk bersantai.</li></ul>
<p>Paket sailing trip dua hari satu malam atau tiga hari dua malam menjadi pilihan populer. Selalu ikuti arahan ranger saat berada di dekat komodo dan jangan meninggalkan rombongan.</p>',
         interval '71 hours'),
        ('Rendang, Warisan Kuliner Minang yang Mendunia',
         'kuliner',
         'Rendang adalah masakan daging berbumbu khas Minangkabau, Sumatra Barat. Daging dimasak perlahan bersama santan dan bumbu seperti cabai, bawang merah, bawang putih, jahe, lengkuas…',
         '/news-covers/rendang.webp',
         'Rendang daging sapi, masakan khas Minangkabau.',
         'Miansari66/Wikimedia Commons, CC0',
         '<p>Rendang adalah masakan daging berbumbu khas Minangkabau, Sumatra Barat. Daging dimasak perlahan bersama santan dan bumbu seperti cabai, bawang merah, bawang putih, jahe, lengkuas, kunyit, serai, dan daun jeruk hingga kuahnya mengering dan meresap.</p>
<h2>Bukan sekadar lauk</h2>
<p>Dalam budaya Minang, rendang hadir di berbagai acara adat dan perayaan. Proses memasaknya yang lama membuat rendang tahan disimpan, sehingga dahulu kerap menjadi bekal ketika merantau.</p>
<h2>Rendang dan kalio</h2>
<p>Bila proses memasak dihentikan saat kuahnya masih kental dan berwarna kecokelatan, hasilnya disebut kalio. Rendang yang dimasak lebih lama berwarna lebih gelap, lebih kering, dan rasanya lebih pekat.</p>
<h2>Tempat terbaik mencicipinya</h2>
<p>Rendang mudah ditemukan di rumah makan Padang di seluruh Indonesia. Namun mencicipinya langsung di Padang, Bukittinggi, atau Payakumbuh memberi pengalaman berbeda, karena setiap daerah punya racikan dan variasi sendiri, mulai dari rendang daging hingga rendang telur dan rendang paku.</p>',
         interval '105 hours'),
        ('Gudeg, Manisnya Kuliner Legendaris dari Yogyakarta',
         'kuliner',
         'Gudeg adalah hidangan khas Yogyakarta yang terbuat dari nangka muda yang dimasak berjam-jam bersama santan, gula jawa, dan rempah. Daun jati yang ikut dimasak memberi warna…',
         '/news-covers/gudeg.webp',
         'Nasi gudeg lengkap dengan telur, krecek, dan ayam.',
         'Christian Razukas/Wikimedia Commons, CC BY-SA 2.0',
         '<p>Gudeg adalah hidangan khas Yogyakarta yang terbuat dari nangka muda yang dimasak berjam-jam bersama santan, gula jawa, dan rempah. Daun jati yang ikut dimasak memberi warna cokelat kemerahan yang khas.</p>
<h2>Gudeg basah dan gudeg kering</h2>
<p>Gudeg basah memiliki kuah santan yang lebih banyak dan biasanya dinikmati langsung. Gudeg kering dimasak lebih lama hingga kuahnya menyusut, sehingga lebih tahan lama dan sering dijadikan oleh-oleh dalam kemasan kendil atau besek.</p>
<h2>Teman makan gudeg</h2>
<ul><li><strong>Sambal goreng krecek</strong>: kulit sapi dengan kuah pedas yang menyeimbangkan rasa manis.</li><li><strong>Telur pindang</strong> dan <strong>ayam opor</strong>.</li><li><strong>Areh</strong>: kuah santan kental yang disiramkan di atas nasi.</li></ul>
<p>Kawasan Wijilan di dekat Keraton Yogyakarta dikenal sebagai sentra gudeg. Di banyak sudut kota, gudeg juga dijual sejak pagi hingga larut malam, jadi kamu bisa mencicipinya kapan saja selama berada di Yogyakarta.</p>',
         interval '139 hours'),
        ('Ngaben, Upacara Kremasi yang Sarat Makna di Bali',
         'wisata-budaya',
         'Ngaben adalah upacara kremasi dalam tradisi Hindu Bali. Upacara ini dimaknai sebagai cara mengembalikan unsur-unsur tubuh ke asalnya dan mengantarkan roh menuju alam berikutnya…',
         '/news-covers/ngaben.webp',
         'Prosesi Ngaben di Nusa Penida, Bali.',
         'Imadedana/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Ngaben adalah upacara kremasi dalam tradisi Hindu Bali. Upacara ini dimaknai sebagai cara mengembalikan unsur-unsur tubuh ke asalnya dan mengantarkan roh menuju alam berikutnya.</p>
<h2>Rangkaian prosesi</h2>
<p>Jenazah atau simbolnya diusung menggunakan menara bernama bade dan dibawa beramai-ramai ke tempat kremasi. Di sana, jenazah dibakar di dalam wadah berbentuk hewan yang disebut patulangan, misalnya berbentuk lembu. Abu kemudian dilarung ke laut atau sungai.</p>
<h2>Ngaben massal</h2>
<p>Karena membutuhkan biaya dan persiapan yang besar, sejumlah desa menggelar ngaben bersama atau ngaben massal. Keluarga dapat menunggu waktu tersebut untuk mengupacarai kerabatnya secara bersama-sama.</p>
<h2>Etika bagi wisatawan</h2>
<ul><li>Gunakan pakaian sopan, sebaiknya dengan kain dan selendang.</li><li>Jangan menghalangi jalannya prosesi atau naik ke tempat yang lebih tinggi dari sarana upacara.</li><li>Minta izin sebelum memotret dan hindari penggunaan lampu kilat.</li><li>Datang bersama pemandu lokal agar memahami tata krama setempat.</li></ul>',
         interval '173 hours'),
        ('Pasola, Tradisi Perang Berkuda yang Memukau di Sumba',
         'wisata-budaya',
         'Pasola adalah tradisi masyarakat Sumba, Nusa Tenggara Timur, berupa permainan ketangkasan dua kelompok penunggang kuda yang saling melempar lembing kayu. Tradisi ini berakar pada…',
         '/news-covers/pasola.webp',
         'Penunggang kuda beraksi dalam tradisi Pasola di Sumba.',
         'RaiyaniM/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Pasola adalah tradisi masyarakat Sumba, Nusa Tenggara Timur, berupa permainan ketangkasan dua kelompok penunggang kuda yang saling melempar lembing kayu. Tradisi ini berakar pada kepercayaan Marapu dan menjadi bagian dari ritual menyambut musim tanam.</p>
<h2>Kapan Pasola digelar</h2>
<p>Pasola biasanya berlangsung sekitar Februari hingga Maret di beberapa wilayah, seperti Kodi, Lamboya, dan Wanokaka. Tanggal pastinya ditentukan para tetua adat, antara lain berdasarkan kemunculan nyale atau cacing laut di pantai. Karena itu, jadwalnya bisa berbeda setiap tahun.</p>
<h2>Menonton dengan aman</h2>
<ul><li>Pantau informasi jadwal dari pemerintah daerah atau pemandu setempat.</li><li>Berdiri di area penonton yang aman, jauh dari lintasan kuda dan lembing.</li><li>Hormati aturan adat dan larangan yang berlaku selama ritual.</li></ul>
<p>Selain Pasola, Sumba juga menawarkan kampung adat dengan rumah beratap menara, padang savana, dan pantai-pantai yang masih sepi.</p>',
         interval '207 hours'),
        ('10 Perlengkapan Wajib Saat Ikut Open Trip',
         'tips-travel',
         'Open trip memungkinkan kamu berlibur bersama peserta lain dengan biaya yang lebih ringan. Agar perjalanan tetap nyaman, siapkan perlengkapan berikut sebelum berangkat. Kartu…',
         '/news-covers/open-trip.webp',
         'Berkemah di atas awan di kawasan Gunung Rinjani, Lombok.',
         'Paxson Woelber/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Open trip memungkinkan kamu berlibur bersama peserta lain dengan biaya yang lebih ringan. Agar perjalanan tetap nyaman, siapkan perlengkapan berikut sebelum berangkat.</p>
<ol><li><strong>Kartu identitas</strong> dan salinannya, termasuk bukti pemesanan.</li><li><strong>Tas yang pas</strong>: ransel ringan untuk trip darat, tas kedap air untuk trip laut.</li><li><strong>Pakaian sesuai destinasi</strong>: jaket untuk gunung, baju cepat kering untuk pantai.</li><li><strong>Obat-obatan pribadi</strong>, termasuk obat antimabuk perjalanan.</li><li><strong>Botol minum isi ulang</strong> agar lebih hemat dan mengurangi sampah plastik.</li><li><strong>Power bank</strong> dan kabel pengisi daya.</li><li><strong>Tabir surya, topi, dan kacamata hitam.</strong></li><li><strong>Uang tunai secukupnya</strong>, karena tidak semua tempat menerima pembayaran nontunai.</li><li><strong>Kantong sampah kecil</strong> untuk membawa pulang sampahmu sendiri.</li><li><strong>Camilan</strong> untuk perjalanan panjang.</li></ol>
<h2>Tips tambahan</h2>
<p>Baca itinerary dan daftar fasilitas paket dengan teliti agar tahu apa saja yang sudah disediakan penyelenggara. Datang tepat waktu di titik kumpul, dan simpan nomor kontak pemandu supaya mudah berkoordinasi selama trip.</p>',
         interval '241 hours'),
        ('Panduan Mendaki Gunung untuk Pemula agar Aman dan Nyaman',
         'tips-travel',
         'Mendaki gunung untuk pertama kali bisa menjadi pengalaman yang tak terlupakan. Kuncinya adalah persiapan yang matang dan memilih jalur yang sesuai kemampuan. Pilih gunung yang…',
         '/news-covers/mendaki.webp',
         'Pendaki menikmati pemandangan pagi di Gunung Prau, Dieng.',
         'Eko Raharjo/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Mendaki gunung untuk pertama kali bisa menjadi pengalaman yang tak terlupakan. Kuncinya adalah persiapan yang matang dan memilih jalur yang sesuai kemampuan.</p>
<h2>Pilih gunung yang ramah pemula</h2>
<p>Mulailah dari gunung dengan jalur yang jelas dan waktu tempuh relatif singkat. Gunung Prau di Dieng, misalnya, sering menjadi pilihan pendaki pemula karena jalurnya populer dan pemandangannya indah.</p>
<h2>Persiapan fisik dan perlengkapan</h2>
<ul><li>Latih fisik beberapa minggu sebelumnya dengan jalan kaki, jogging, atau naik turun tangga.</li><li>Gunakan sepatu dengan sol yang tidak licin dan sudah nyaman dipakai.</li><li>Bawa jaket hangat, jas hujan, senter kepala, dan makanan berenergi.</li><li>Siapkan air minum yang cukup sesuai lama pendakian.</li></ul>
<h2>Selama pendakian</h2>
<ul><li>Lakukan registrasi di basecamp dan patuhi aturan pengelola.</li><li>Jangan mendaki sendirian. Bergabung dengan rombongan atau pemandu lebih aman.</li><li>Atur napas dan istirahat secukupnya, jangan memaksakan diri.</li><li>Bawa turun kembali semua sampahmu.</li></ul>
<p>Bila cuaca memburuk atau tubuh terasa tidak sehat, jangan ragu untuk turun. Puncak bisa menunggu, keselamatan tetap nomor satu.</p>',
         interval '275 hours'),
        ('Cara Mengatur Anggaran Liburan agar Tetap Hemat',
         'tips-travel',
         'Liburan tidak harus mahal. Dengan perencanaan yang tepat, kamu bisa menikmati perjalanan tanpa membuat isi dompet terkuras. Tentukan anggaran sejak awal Hitung total biaya yang…',
         '/news-covers/hemat.webp',
         'Suasana Jalan Malioboro, Yogyakarta.',
         'Gunawan Kartapranata/Wikimedia Commons, CC BY-SA 3.0',
         '<p>Liburan tidak harus mahal. Dengan perencanaan yang tepat, kamu bisa menikmati perjalanan tanpa membuat isi dompet terkuras.</p>
<h2>Tentukan anggaran sejak awal</h2>
<p>Hitung total biaya yang dibutuhkan, mulai dari transportasi, penginapan, makan, tiket masuk, hingga oleh-oleh. Tambahkan dana cadangan sekitar 10 persen untuk kebutuhan tak terduga.</p>
<h2>Menabung sedikit demi sedikit</h2>
<p>Setelah tahu targetnya, bagi jumlah tersebut dengan sisa waktu sebelum berangkat. Fitur <strong>Rencana Trip</strong> di TemenTrip bisa membantu mencatat target dan perkembangan tabunganmu.</p>
<h2>Trik hemat selama perjalanan</h2>
<ul><li>Berangkat di luar musim liburan agar harga transportasi dan penginapan lebih bersahabat.</li><li>Ikut open trip untuk berbagi biaya transportasi dan pemandu.</li><li>Cicipi kuliner lokal di warung, selain lebih murah rasanya juga lebih autentik.</li><li>Gunakan transportasi umum bila tersedia.</li></ul>
<p>Yang terpenting, catat setiap pengeluaran selama perjalanan supaya kamu tahu ke mana uangmu pergi dan bisa merencanakan liburan berikutnya dengan lebih baik.</p>',
         interval '309 hours'),
        -- Cerita
        ('Misteri Pasar Setan di Gunung Lawu',
         'mistis',
         'Gunung Lawu yang berdiri di perbatasan Jawa Tengah dan Jawa Timur bukan hanya dikenal karena jalur pendakiannya. Gunung ini juga lekat dengan berbagai kisah mistis yang…',
         '/news-covers/lawu.webp',
         'Lautan awan dilihat dari puncak Gunung Lawu.',
         'Muhammad Irvan Hermawan/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Gunung Lawu yang berdiri di perbatasan Jawa Tengah dan Jawa Timur bukan hanya dikenal karena jalur pendakiannya. Gunung ini juga lekat dengan berbagai kisah mistis yang diceritakan turun-temurun, salah satunya tentang Pasar Setan.</p>
<h2>Keramaian yang tak terlihat</h2>
<p>Konon, sebagian pendaki pernah mendengar suara riuh seperti orang berjualan dan tawar-menawar di area tertentu menuju puncak, padahal tidak ada siapa pun di sana. Menurut cerita yang beredar, bila mendengar suara itu, pendaki disarankan membuang sesuatu, seperti uang receh atau daun, seolah sedang membeli sesuatu, lalu melanjutkan perjalanan tanpa menoleh.</p>
<h2>Gunung yang dihormati</h2>
<p>Lawu juga dikaitkan dengan kisah Prabu Brawijaya V, raja terakhir Majapahit, yang dipercaya menyepi di gunung ini. Karena itu, banyak peziarah datang ke petilasan di sekitar puncak, dan masyarakat setempat memegang sejumlah pantangan, misalnya larangan berbicara sembarangan atau berbuat tidak sopan selama mendaki.</p>
<h2>Percaya atau tidak, tetap waspada</h2>
<p>Terlepas dari percaya atau tidak, kisah-kisah ini mengingatkan pendaki untuk menjaga sikap, tidak memisahkan diri dari rombongan, dan memperhatikan cuaca. Kabut di Lawu bisa turun dengan cepat dan membuat jalur sulit dikenali.</p>',
         interval '20 hours'),
        ('Alas Purwo, Hutan Tua di Ujung Timur Jawa yang Penuh Kisah Gaib',
         'mistis',
         'Taman Nasional Alas Purwo terletak di ujung tenggara Pulau Jawa, Kabupaten Banyuwangi. Namanya kerap diartikan sebagai "hutan pertama" atau "hutan permulaan", dan sebagian…',
         '/news-covers/alas-purwo.webp',
         'Jalan membelah hutan di kawasan Alas Purwo, Banyuwangi.',
         'Hasiholan Siahaan XIV/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Taman Nasional Alas Purwo terletak di ujung tenggara Pulau Jawa, Kabupaten Banyuwangi. Namanya kerap diartikan sebagai &#34;hutan pertama&#34; atau &#34;hutan permulaan&#34;, dan sebagian masyarakat meyakininya sebagai salah satu tempat tertua di tanah Jawa.</p>
<h2>Tempat bertapa dan berziarah</h2>
<p>Di dalam kawasan hutan terdapat sejumlah gua yang sejak lama didatangi orang untuk bersemedi atau mencari ketenangan batin. Kisah tentang suara-suara aneh dan penampakan di tengah hutan pun banyak diceritakan, terutama oleh mereka yang pernah bermalam di sana.</p>
<h2>Alam yang memukau</h2>
<p>Di balik cerita mistisnya, Alas Purwo menyimpan kekayaan alam yang luar biasa. Padang penggembalaan Sadengan menjadi tempat banteng dan rusa mencari makan, sementara Pantai Plengkung atau G-Land terkenal di kalangan peselancar dunia berkat ombaknya yang panjang.</p>
<h2>Tips berkunjung</h2>
<ul><li>Datang pada siang hari dan ikuti jalur resmi taman nasional.</li><li>Lapor ke pos petugas sebelum masuk kawasan.</li><li>Hormati tempat-tempat yang dianggap sakral oleh masyarakat setempat.</li></ul>',
         interval '54 hours'),
        ('Lawang Sewu, Gedung Tua Semarang dengan Seribu Cerita',
         'mistis',
         'Lawang Sewu adalah gedung bersejarah di Semarang yang dibangun pada masa Hindia Belanda sebagai kantor perusahaan kereta api Nederlandsch-Indische Spoorweg Maatschappij (NIS)…',
         '/news-covers/lawang-sewu.webp',
         'Gedung Lawang Sewu di Kota Semarang, Jawa Tengah.',
         'Philip Nalangan/Wikimedia Commons, CC BY 4.0',
         '<p>Lawang Sewu adalah gedung bersejarah di Semarang yang dibangun pada masa Hindia Belanda sebagai kantor perusahaan kereta api Nederlandsch-Indische Spoorweg Maatschappij (NIS). Namanya berarti &#34;seribu pintu&#34;, merujuk pada banyaknya pintu dan jendela besar di gedung ini.</p>
<h2>Jejak sejarah yang kelam</h2>
<p>Gedung ini menjadi saksi berbagai peristiwa, termasuk masa pendudukan Jepang dan pertempuran di Semarang pada awal kemerdekaan. Ruang bawah tanahnya yang gelap dan lembap kerap dikaitkan dengan cerita-cerita seram, sehingga Lawang Sewu dikenal luas sebagai salah satu bangunan angker di Indonesia.</p>
<h2>Kini menjadi museum</h2>
<p>Setelah direstorasi, Lawang Sewu dibuka untuk umum sebagai destinasi wisata sejarah. Pengunjung dapat menjelajahi lorong-lorong panjang, mengagumi kaca patri yang indah, dan mempelajari sejarah perkeretaapian Indonesia.</p>
<p>Datanglah pada sore hari ketika cahaya matahari menyinari bangunan, lalu bertahan hingga malam untuk merasakan suasana yang berbeda. Selebihnya, biarkan imajinasimu yang bekerja.</p>',
         interval '88 hours'),
        ('Nyi Roro Kidul dan Larangan Berbaju Hijau di Pantai Selatan',
         'mistis',
         'Nyi Roro Kidul adalah sosok legendaris yang dipercaya sebagai penguasa Laut Selatan Jawa. Kisahnya dikenal luas di sepanjang pesisir selatan, dari Pelabuhan Ratu di Jawa Barat…',
         '/news-covers/parangtritis.webp',
         'Ombak Samudra Hindia di kawasan Pantai Parangtritis, Bantul.',
         'Jones Averino/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Nyi Roro Kidul adalah sosok legendaris yang dipercaya sebagai penguasa Laut Selatan Jawa. Kisahnya dikenal luas di sepanjang pesisir selatan, dari Pelabuhan Ratu di Jawa Barat hingga Parangtritis di Yogyakarta.</p>
<h2>Mitos baju hijau</h2>
<p>Salah satu pantangan yang paling terkenal adalah larangan memakai pakaian berwarna hijau di pantai selatan. Menurut kepercayaan setempat, hijau adalah warna kesukaan sang ratu, sehingga mereka yang mengenakannya bisa &#34;diambil&#34; oleh ombak.</p>
<h2>Fakta di balik mitos</h2>
<p>Terlepas dari kepercayaan tersebut, pantai-pantai di selatan Jawa memang memiliki ombak besar dan arus balik atau rip current yang kuat. Arus ini dapat menyeret perenang ke tengah laut dengan cepat. Pakaian hijau juga sulit terlihat di antara air laut, sehingga menyulitkan tim penyelamat.</p>
<h2>Tetap aman di pantai selatan</h2>
<ul><li>Patuhi rambu dan bendera larangan berenang.</li><li>Jangan berenang terlalu jauh dari bibir pantai.</li><li>Bila terseret arus, berenanglah sejajar garis pantai, jangan melawan arus.</li><li>Ikuti arahan petugas penyelamat pantai.</li></ul>',
         interval '122 hours'),
        ('Legenda Baru Klinting dan Asal-usul Rawa Pening',
         'mistis',
         'Rawa Pening adalah danau alami di Kabupaten Semarang, Jawa Tengah, yang dikelilingi Gunung Merbabu, Gunung Telomoyo, dan Gunung Ungaran. Di balik pemandangannya yang tenang, danau…',
         '/news-covers/rawa-pening.webp',
         'Suasana berkabut di Danau Rawa Pening, Kabupaten Semarang.',
         'Andra/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Rawa Pening adalah danau alami di Kabupaten Semarang, Jawa Tengah, yang dikelilingi Gunung Merbabu, Gunung Telomoyo, dan Gunung Ungaran. Di balik pemandangannya yang tenang, danau ini menyimpan legenda yang diceritakan dari generasi ke generasi.</p>
<h2>Kisah Baru Klinting</h2>
<p>Alkisah, seorang anak bernama Baru Klinting datang ke sebuah desa yang sedang berpesta. Tubuhnya penuh luka sehingga warga mengusir dan mengejeknya. Hanya seorang nenek yang mau menolong dan memberinya makan.</p>
<p>Baru Klinting lalu menancapkan sebatang lidi ke tanah dan menantang warga untuk mencabutnya. Tak seorang pun berhasil. Ketika Baru Klinting sendiri mencabut lidi itu, air menyembur deras dari lubang bekas tancapan dan menenggelamkan desa. Hanya sang nenek yang selamat karena telah diberi pesan untuk menyiapkan lesung sebagai perahu.</p>
<h2>Pesan yang tersisa</h2>
<p>Legenda ini mengajarkan untuk tidak menilai orang dari penampilan dan selalu menolong sesama. Kini, wisatawan bisa menyusuri Rawa Pening dengan perahu, menikmati matahari terbit di antara hamparan eceng gondok, atau mencicipi ikan segar di warung tepi danau.</p>',
         interval '156 hours'),
        ('Trunyan, Desa di Tepi Danau Batur dengan Tradisi Pemakaman yang Unik',
         'mistis',
         'Desa Trunyan di tepi Danau Batur, Kintamani, Kabupaten Bangli, dihuni masyarakat Bali Aga, yaitu penduduk Bali yang mempertahankan tradisi sejak sebelum pengaruh Majapahit. Desa…',
         '/news-covers/trunyan.webp',
         'Danau Batur di Kintamani, Bali, tempat Desa Trunyan berada.',
         'Uwe Aranas/Wikimedia Commons, CC BY-SA 3.0',
         '<p>Desa Trunyan di tepi Danau Batur, Kintamani, Kabupaten Bangli, dihuni masyarakat Bali Aga, yaitu penduduk Bali yang mempertahankan tradisi sejak sebelum pengaruh Majapahit. Desa ini dikenal karena tradisi pemakaman yang tidak biasa.</p>
<h2>Jenazah di bawah pohon taru menyan</h2>
<p>Pada tradisi tertentu, jenazah warga tidak dikubur atau dikremasi, melainkan dibaringkan di atas tanah dan dilindungi kurungan bambu bernama ancak saji. Menariknya, bau jenazah tidak tercium menyengat. Warga meyakini hal ini berkat pohon taru menyan yang tumbuh di area pemakaman dan menebarkan aroma harum.</p>
<h2>Bukan untuk ditonton sembarangan</h2>
<p>Area pemakaman dapat dikunjungi dengan menyeberangi Danau Batur menggunakan perahu dan didampingi warga setempat. Ingatlah bahwa ini adalah tempat peristirahatan terakhir yang disakralkan. Jaga sikap, jangan menyentuh apa pun, dan tanyakan dulu sebelum mengambil foto.</p>
<p>Perjalanan ke Trunyan bisa dipadukan dengan menikmati pemandangan Gunung dan Danau Batur, berendam di pemandian air panas, atau mencicipi kopi Kintamani.</p>',
         interval '190 hours'),
        ('Legenda Sangkuriang dan Terbentuknya Gunung Tangkuban Perahu',
         'wisata-budaya',
         'Gunung Tangkuban Perahu di utara Bandung, Jawa Barat, memiliki bentuk yang menyerupai perahu terbalik. Dari bentuk inilah lahir salah satu legenda paling terkenal dari tanah…',
         '/news-covers/tangkuban.webp',
         'Kawah Ratu di Gunung Tangkuban Perahu, Jawa Barat.',
         'DimasSepur/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Gunung Tangkuban Perahu di utara Bandung, Jawa Barat, memiliki bentuk yang menyerupai perahu terbalik. Dari bentuk inilah lahir salah satu legenda paling terkenal dari tanah Sunda: kisah Sangkuriang dan Dayang Sumbi.</p>
<h2>Permintaan yang mustahil</h2>
<p>Dikisahkan, Sangkuriang yang lama merantau kembali dan jatuh cinta kepada Dayang Sumbi tanpa menyadari bahwa perempuan itu adalah ibunya sendiri. Untuk menolak secara halus, Dayang Sumbi mengajukan syarat: Sangkuriang harus membendung Sungai Citarum dan membuat sebuah perahu besar dalam satu malam.</p>
<p>Dengan bantuan makhluk gaib, pekerjaan itu hampir selesai. Dayang Sumbi lalu membentangkan kain putih dan memukul lesung sehingga ayam berkokok seolah fajar telah tiba. Sangkuriang yang marah karena gagal menendang perahunya hingga terbalik, dan perahu itu menjadi Gunung Tangkuban Perahu.</p>
<h2>Berkunjung ke kawahnya</h2>
<p>Kini pengunjung dapat melihat Kawah Ratu dan Kawah Domas dari dekat. Bawa jaket karena udaranya sejuk, gunakan masker bila bau belerang terasa menyengat, dan selalu cek informasi status gunung sebelum berangkat.</p>',
         interval '224 hours'),
        ('Kisah Roro Jonggrang di Balik Megahnya Candi Prambanan',
         'wisata-budaya',
         'Candi Prambanan adalah kompleks candi Hindu terbesar di Indonesia dan telah ditetapkan sebagai Situs Warisan Dunia UNESCO. Candi yang dibangun pada abad ke-9 ini dipersembahkan…',
         '/news-covers/prambanan.webp',
         'Kompleks Candi Prambanan di perbatasan Yogyakarta dan Jawa Tengah.',
         'Uwe Aranas/Wikimedia Commons, CC BY-SA 3.0',
         '<p>Candi Prambanan adalah kompleks candi Hindu terbesar di Indonesia dan telah ditetapkan sebagai Situs Warisan Dunia UNESCO. Candi yang dibangun pada abad ke-9 ini dipersembahkan untuk Trimurti: Brahma, Wisnu, dan Siwa.</p>
<h2>Seribu candi dalam semalam</h2>
<p>Masyarakat mengenal Prambanan lewat legenda Roro Jonggrang. Bandung Bondowoso ingin meminang sang putri, tetapi Roro Jonggrang memberi syarat agar dibuatkan seribu candi dalam satu malam. Dibantu makhluk halus, Bandung Bondowoso hampir menyelesaikannya.</p>
<p>Roro Jonggrang lalu meminta para perempuan desa menumbuk padi dan menyalakan api agar tampak seperti fajar. Ayam berkokok dan makhluk halus pun pergi sebelum candi keseribu selesai. Merasa dicurangi, Bandung Bondowoso mengutuk Roro Jonggrang menjadi arca. Arca Durga di candi utama dipercaya sebagai perwujudannya.</p>
<h2>Waktu terbaik berkunjung</h2>
<p>Datanglah pagi hari agar tidak terlalu panas, atau sore hari untuk menikmati siluet candi saat matahari terbenam. Pada waktu tertentu, Sendratari Ramayana juga dipentaskan dengan latar Candi Prambanan.</p>',
         interval '258 hours'),
        ('Legenda Danau Toba: Janji yang Tak Boleh Dilanggar',
         'lainnya',
         'Danau Toba di Sumatra Utara adalah danau vulkanik terbesar di Indonesia. Danau ini terbentuk dari letusan dahsyat gunung api purba puluhan ribu tahun lalu. Namun masyarakat Batak…',
         '/news-covers/toba.webp',
         'Danau Toba dan Pulau Samosir dilihat dari ketinggian, Sumatra Utara.',
         'Nirwanto Honsono/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Danau Toba di Sumatra Utara adalah danau vulkanik terbesar di Indonesia. Danau ini terbentuk dari letusan dahsyat gunung api purba puluhan ribu tahun lalu. Namun masyarakat Batak juga mewariskan legenda tentang asal-usulnya.</p>
<h2>Ikan yang menjadi perempuan</h2>
<p>Alkisah, seorang pemuda bernama Toba menangkap ikan besar yang kemudian menjelma menjadi perempuan cantik. Perempuan itu bersedia menikah dengan Toba dengan satu syarat: Toba tidak boleh menyebut asal-usulnya sebagai ikan.</p>
<p>Mereka dikaruniai seorang anak bernama Samosir. Suatu hari, Toba marah karena bekal makan siangnya dihabiskan sang anak, lalu tanpa sadar mengucapkan kata-kata yang melanggar janjinya. Seketika hujan deras turun, air memancar dari tanah dan menenggelamkan lembah. Lembah itu menjadi Danau Toba, sedangkan pulau di tengahnya dinamai Samosir.</p>
<h2>Menjelajah Samosir</h2>
<p>Wisatawan dapat menyeberang ke Pulau Samosir dengan kapal dari Parapat atau Ajibata. Di sana, kamu bisa mengunjungi kampung adat, melihat makam raja-raja Batak, dan menyaksikan pertunjukan boneka Sigale-gale.</p>',
         interval '292 hours'),
        ('Malin Kundang dan Batu di Pantai Air Manis',
         'lainnya',
         'Pantai Air Manis di Kota Padang, Sumatra Barat, menjadi tempat yang dikaitkan dengan salah satu cerita rakyat paling terkenal di Indonesia: Malin Kundang, si anak durhaka. Kisah…',
         '/news-covers/malin-kundang.webp',
         'Batu yang dikaitkan dengan legenda Malin Kundang di Pantai Air Manis, Padang.',
         'Crisco 1492/Wikimedia Commons, CC BY-SA 4.0',
         '<p>Pantai Air Manis di Kota Padang, Sumatra Barat, menjadi tempat yang dikaitkan dengan salah satu cerita rakyat paling terkenal di Indonesia: Malin Kundang, si anak durhaka.</p>
<h2>Kisah si anak durhaka</h2>
<p>Malin Kundang adalah anak dari keluarga sederhana yang pergi merantau untuk mengubah nasib. Bertahun-tahun kemudian, ia kembali sebagai saudagar kaya bersama istrinya. Ibunya yang sudah tua datang menyambut dengan penuh rindu, tetapi Malin menolak mengakuinya karena malu.</p>
<p>Dengan hati yang hancur, sang ibu berdoa. Badai pun datang menghantam kapal Malin, dan tubuhnya berubah menjadi batu dalam posisi bersujud.</p>
<h2>Melihat batunya secara langsung</h2>
<p>Di Pantai Air Manis, pengunjung dapat melihat formasi batu yang menyerupai sosok bersujud beserta pecahan kapal di sekitarnya. Saat air surut, kamu juga bisa berjalan menuju Pulau Pisang Kecil di dekat pantai. Datanglah sore hari untuk menikmati matahari terbenam di tepi Samudra Hindia.</p>',
         interval '326 hours')
    ) AS s(title, category, excerpt, cover_image, cover_caption, cover_source, content, age)
    WHERE NOT EXISTS (SELECT 1 FROM news n WHERE n.title = s.title);

    IF NOT EXISTS (SELECT 1 FROM news_placements) THEN
        INSERT INTO news_placements (slot, position, news_id)
        SELECT p.slot, p.position, n.id
        FROM (VALUES
        ('featured', 1, 'Raja Ampat, Surga Bawah Laut di Ujung Timur Indonesia'),
        ('featured', 2, 'Berburu Matahari Terbit di Bromo: Waktu Terbaik dan Tips Agar Nyaman'),
        ('featured', 3, 'Misteri Pasar Setan di Gunung Lawu'),
        ('featured', 4, 'Kisah Roro Jonggrang di Balik Megahnya Candi Prambanan'),
        ('featured', 5, 'Rendang, Warisan Kuliner Minang yang Mendunia'),
        ('editor_pick', 1, 'Labuan Bajo dan Pulau Padar, Gerbang Petualangan di Taman Nasional Komodo'),
        ('editor_pick', 2, 'Nyi Roro Kidul dan Larangan Berbaju Hijau di Pantai Selatan'),
        ('editor_pick', 3, 'Pasola, Tradisi Perang Berkuda yang Memukau di Sumba'),
        ('editor_pick', 4, 'Lawang Sewu, Gedung Tua Semarang dengan Seribu Cerita'),
        ('editor_pick', 5, 'Gudeg, Manisnya Kuliner Legendaris dari Yogyakarta')
        ) AS p(slot, position, title)
        JOIN LATERAL (
            SELECT id FROM news WHERE title = p.title AND status = 'PUBLISHED' ORDER BY id LIMIT 1
        ) n ON true;
    END IF;
END
$seed$;

COMMIT;
