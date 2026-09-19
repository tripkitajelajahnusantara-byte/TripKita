/* ==========================================
   TripKita Mobile Prototype Controller (Enhanced)
   ========================================== */

// 1. Data Standard 38 Provinsi Indonesia
const INDONESIA_PROVINCES = [
    "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", 
    "Jambi", "Sumatera Selatan", "Bangka Belitung", "Bengkulu", "Lampung",
    "DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur",
    "Bali", "Nusa Tenggara Barat (NTB)", "Nusa Tenggara Timur (NTT)",
    "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
    "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara",
    "Maluku", "Maluku Utara",
    "Papua", "Papua Barat", "Papua Barat Daya", "Papua Tengah", "Papua Pegunungan", "Papua Selatan"
];

// 2. Kategori Trip (6 Kategori Resmi)
const TRIP_CATEGORIES = [
    { name: "Semua", icon: "fa-solid fa-border-all" },
    { name: "City Tour", icon: "fa-solid fa-city" },
    { name: "Diving & Snorkeling", icon: "fa-solid fa-mask-snorkel" },
    { name: "Wisata Budaya & Sejarah", icon: "fa-solid fa-monument" },
    { name: "Pantai", icon: "fa-solid fa-umbrella-beach" },
    { name: "Gunung", icon: "fa-solid fa-mountain" },
    { name: "Keluarga Santai", icon: "fa-solid fa-users" }
];

const TRIP_TYPES = ["Semua Tipe", "Open Trip", "Private Trip", "Custom Trip"];

// 3. Mock Database Packages (Synced 1-to-1 with Provider "Wisata Nusantara" & Database)
const packagesDB = [
    {
        id: 99,
        name: "Open Trip Palu & Teluk Tomini 3D2N",
        destination: "Palu, Sulawesi Tengah",
        province: "Sulawesi Tengah",
        price: 1450000,
        quotaMin: 4,
        quotaUsed: 3,
        quotaMax: 15,
        schedule: ["17 Mar - 19 Mar 2027 (3 Hari)"],
        status: "Aktif",
        rating: 4.9,
        reviewCount: 42,
        duration: "3 Hari 2 Malam",
        tripType: "Open Trip",
        category: "Wisata Bahari & Alam",
        minParticipants: 4,
        availableSeats: 12,
        highlights: [" Tour Guide Local", " Snorkeling Gear", " Dokumentasi Under Water"],
        providerName: "TemenTrip Partner",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Jelajahi pesona alam pesisir Palu dan keindahan bawah laut Teluk Tomini.",
        images: ["https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600"]
    },
    {
        id: 1,
        name: "Rumah Ayu Ting-Ting",
        destination: "Jawa Barat",
        province: "Jawa Barat",
        price: 2000000,
        quotaMin: 5,
        quotaUsed: 3,
        quotaMax: 15,
        schedule: ["16 Sep - 18 Sep 2026 (3 Hari)"],
        status: "Aktif",
        rating: 4.8,
        reviewCount: 50,
        duration: "3 Hari 2 Malam",
        tripType: "Open Trip",
        category: "Wisata Budaya & Sejarah",
        minParticipants: 5,
        availableSeats: 12,
        highlights: [" Tour Guide Sertifikasi", " Dokumentasi Lengkap", " Armada Transport AC"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Nikmati wisata budaya dan sejarah di Rumah Ayu Ting-Ting.",
        images: ["https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600"]
    },
    {
        id: 2,
        name: "Wisata Margo City",
        destination: "Jawa Barat",
        province: "Jawa Barat",
        price: 120000,
        quotaMin: 4,
        quotaUsed: 2,
        quotaMax: 12,
        schedule: ["16 Sep - 17 Sep 2026 (2 Hari)"],
        status: "Aktif",
        rating: 5.0,
        reviewCount: 50,
        duration: "2 Hari 1 Malam",
        tripType: "Open Trip",
        category: "City Tour",
        minParticipants: 4,
        availableSeats: 10,
        highlights: [" Tour Guide Sertifikasi", " Dokumentasi Lengkap", " Armada Transport AC"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Jelajahi keindahan dan pusat hiburan Margo City.",
        images: ["https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600"]
    },
    {
        id: 3,
        name: "Bandung City Tour",
        destination: "Bandung, Jawa Barat",
        province: "Jawa Barat",
        price: 420000,
        quotaMin: 4,
        quotaUsed: 3,
        quotaMax: 15,
        schedule: ["16 Sep - 17 Sep 2026 (2 Hari)"],
        status: "Aktif",
        rating: 4.0,
        reviewCount: 50,
        duration: "2 Hari 1 Malam",
        tripType: "Open Trip",
        category: "City Tour",
        minParticipants: 4,
        availableSeats: 12,
        highlights: [" Tour Guide Sertifikasi", " Dokumentasi Lengkap", " Armada Transport AC"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Kelilingi destinasi favorit di Kota Bandung.",
        images: ["https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600"]
    },
    {
        id: 4,
        name: "Trip Curug Cilember",
        destination: "Bogor, Jawa Barat",
        province: "Jawa Barat",
        price: 275000,
        quotaMin: 5,
        quotaUsed: 4,
        quotaMax: 10,
        schedule: ["16 Sep - 17 Sep 2026 (2 Hari)"],
        status: "Aktif",
        rating: 4.0,
        reviewCount: 50,
        duration: "2 Hari 1 Malam",
        tripType: "Open Trip",
        category: "Curug",
        minParticipants: 5,
        availableSeats: 6,
        highlights: [" 7 Tingkat Air Terjun", " Hutan Pinus Asri", " Api Unggun Malam"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Wisata 7 air terjun Curug Cilember Bogor.",
        images: ["https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=600"]
    },
    {
        id: 5,
        name: "Baturaden 3D2N",
        destination: "Jawa Tengah",
        province: "Jawa Tengah",
        price: 500000,
        quotaMin: 1,
        quotaUsed: 1,
        quotaMax: 10,
        schedule: ["Fleksibel (Pilihan Customer)"],
        status: "Aktif",
        rating: 5.0,
        reviewCount: 50,
        duration: "3 Hari 2 Malam",
        tripType: "Private Trip",
        category: "Gunung",
        minParticipants: 1,
        availableSeats: 9,
        highlights: [" Mobil Private & Driver", " Pemandu & Dokumen Pro", " Jam Trip Fleksibel"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Wisata eksklusif Baturaden 3 hari 2 malam.",
        images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"]
    },
    {
        id: 6,
        name: "Honeymoon Island Sunset Tidung 3D2N",
        destination: "Kepulauan Seribu, Jakarta",
        province: "DKI Jakarta",
        price: 1650000,
        quotaMin: 2,
        quotaUsed: 2,
        quotaMax: 2,
        schedule: ["Fleksibel (Pilihan Customer)"],
        status: "Aktif",
        rating: 5.0,
        reviewCount: 50,
        duration: "3 Hari 2 Malam",
        tripType: "Honeymoon",
        category: "Pantai",
        minParticipants: 2,
        availableSeats: 2,
        highlights: [" Floating Breakfast", " Private Pool Villa", " Candlelight Dinner"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Honeymoon romantis di Pulau Tidung Kepulauan Seribu.",
        images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"]
    },
    {
        id: 7,
        name: "Honeymoon Romantic Bali Villa 3D2N",
        destination: "Bali",
        province: "Bali",
        price: 2950000,
        quotaMin: 2,
        quotaUsed: 2,
        quotaMax: 2,
        schedule: ["Fleksibel (Pilihan Customer)"],
        status: "Aktif",
        rating: 5.0,
        reviewCount: 50,
        duration: "3 Hari 2 Malam",
        tripType: "Honeymoon",
        category: "Pantai",
        minParticipants: 2,
        availableSeats: 2,
        highlights: [" Floating Breakfast", " Private Pool Villa", " Candlelight Dinner"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Paket honeymoon romantis di villa private Bali.",
        images: ["https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600"]
    },
    {
        id: 8,
        name: "Private Trip Wisata Raja Ampat 4D3N",
        destination: "Papua Barat",
        province: "Papua Barat",
        price: 3850000,
        quotaMin: 1,
        quotaUsed: 1,
        quotaMax: 8,
        schedule: ["Fleksibel (Pilihan Customer)"],
        status: "Aktif",
        rating: 5.0,
        reviewCount: 50,
        duration: "4 Hari 3 Malam",
        tripType: "Private Trip",
        category: "Diving & Snorkeling",
        minParticipants: 1,
        availableSeats: 7,
        highlights: [" Mobil Private & Driver", " Pemandu & Dokumen Pro", " Jam Trip Fleksibel"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Jelajahi surga bawah laut Raja Ampat Papua Barat.",
        images: ["https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600"]
    },
    {
        id: 9,
        name: "Pantai Muara Gembong",
        destination: "Jawa Barat",
        province: "Jawa Barat",
        price: 150000,
        quotaMin: 10,
        quotaUsed: 10,
        quotaMax: 50,
        schedule: ["Fleksibel (Pilihan Group)"],
        status: "Aktif",
        rating: 5.0,
        reviewCount: 50,
        duration: "1 Hari",
        tripType: "Corporate",
        category: "Pantai",
        minParticipants: 10,
        availableSeats: 40,
        highlights: [" Snorkeling Terumbu Karang", " Free Foto Underwater", " Sepeda Keliling Pulau"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Wisata pantai dan ekosistem mangrove Pantai Muara Gembong.",
        images: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"]
    },
    {
        id: 10,
        name: "Corporate Team Building Bogor 2D1N",
        destination: "Bogor, Jawa Barat",
        province: "Jawa Barat",
        price: 680000,
        quotaMin: 10,
        quotaUsed: 10,
        quotaMax: 100,
        schedule: ["Fleksibel (Pilihan Group)"],
        status: "Aktif",
        rating: 4.9,
        reviewCount: 50,
        duration: "2 Hari 1 Malam",
        tripType: "Corporate",
        category: "Keluarga Santai",
        minParticipants: 10,
        availableSeats: 90,
        highlights: [" Outbound Team Building", " Bus Luxury VIP", " Gala Dinner & BBQ"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Kegiatan team building & gathering perusahaan di Bogor.",
        images: ["https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600"]
    },
    {
        id: 11,
        name: "Corporate Gathering & Outbound Bandung",
        destination: "Bandung, Jawa Barat",
        province: "Jawa Barat",
        price: 750000,
        quotaMin: 10,
        quotaUsed: 10,
        quotaMax: 100,
        schedule: ["Fleksibel (Pilihan Group)"],
        status: "Aktif",
        rating: 4.9,
        reviewCount: 50,
        duration: "2 Hari 1 Malam",
        tripType: "Corporate",
        category: "Keluarga Santai",
        minParticipants: 10,
        availableSeats: 90,
        highlights: [" Outbound Team Building", " Bus Luxury VIP", " Gala Dinner & BBQ"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Acara gathering outbound kantor seru di Bandung.",
        images: ["https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600"]
    },
    {
        id: 12,
        name: "Family Nature Retreat Cilember 2D1N",
        destination: "Bogor, Jawa Barat",
        province: "Jawa Barat",
        price: 650000,
        quotaMin: 5,
        quotaUsed: 5,
        quotaMax: 20,
        schedule: ["Fleksibel (Pilihan Keluarga)"],
        status: "Aktif",
        rating: 4.9,
        reviewCount: 50,
        duration: "2 Hari 1 Malam",
        tripType: "Family",
        category: "Curug",
        minParticipants: 5,
        availableSeats: 15,
        highlights: [" 7 Tingkat Air Terjun", " Hutan Pinus Asri", " Api Unggun Malam"],
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Liburan keluarga santai menikmati alam Cilember Bogor.",
        images: ["https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=600"]
    }
];

// 4. Mock User & Auth State
let currentUser = {
    isLoggedIn: true,
    name: "Budi Santoso",
    email: "budi.santoso@gmail.com",
    phone: "081234567890",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
    loginMethod: "Google"
};

// 5. Mock User Bookings DB (Supports Dummy Simulation)
let bookingsDB = [
    {
        id: "BK-1001",
        bookingCode: "TK-2824-1891",
        packageId: 1,
        packageName: "Open Trip Raja Ampat",
        destination: "Raja Ampat, Papua",
        schedule: "28 Mei 2024",
        guestsCount: 2,
        totalPrice: 5500000,
        status: "Lunas", // "Menunggu Pembayaran", "Lunas", "Dibatalkan"
        paymentDate: "2026-07-21 14:00",
        paymentMethod: "QRIS GPN",
        hasGroupChat: true,
        travelers: [
            { name: "Budi Santoso", email: "budi.santoso@gmail.com", phone: "081234567890" },
            { name: "Siti Aminah", email: "siti@gmail.com", phone: "081298765432" }
        ]
    },
    {
        id: "BK-1002",
        bookingCode: "TK-2824-9090",
        packageId: 2,
        packageName: "Open Trip Belitung Granit",
        destination: "Belitung, Bangka Belitung",
        schedule: "01 Jun 2024",
        guestsCount: 1,
        totalPrice: 1890000,
        status: "Menunggu Pembayaran",
        paymentDate: "-",
        paymentMethod: "BCA Virtual Account",
        hasGroupChat: false,
        travelers: [
            { name: "Budi Santoso", email: "budi.santoso@gmail.com", phone: "081234567890" }
        ]
    }
];

// 6. Mock Chat Rooms DB (Dynamic Group Chat & Direct Chat)
let chatRoomsDB = [
    {
        id: "group-rajaampat",
        type: "group", // "group" or "direct"
        title: "Group Chat: Open Trip Raja Ampat",
        subTitle: "Trip: 28 Mei 2024 • 4 Peserta",
        image: "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=200",
        packageId: 1,
        unreadCount: 1,
        lastMessage: "Capt. Herman: Salam kenal semuanya! Jangan lupa bawa sunscreen dan lotion anti nyamuk ya.",
        lastTime: "14:32",
        isUnlocked: true,
        members: [
            { name: "Capt. Herman", role: "Tour Guide", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
            { name: "Budi Santoso (Anda)", role: "Peserta", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" },
            { name: "Rina Wijaya", role: "Peserta", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" },
            { name: "Doni Pratama", role: "Peserta", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100" }
        ],
        messages: [
            { sender: "System", text: "Selamat bergabung di Group Chat Trip Raja Ampat! Pembayaran Anda telah dikonfirmasi.", time: "14:00", isSystem: true },
            { sender: "Capt. Herman", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", text: "Halo semua traveler! Saya Herman, tour guide kalian untuk trip Raja Ampat 28 Mei.", time: "14:15", isMe: false },
            { sender: "Rina Wijaya", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", text: "Halo Mas Herman! Penjemputan di bandara jam berapa ya?", time: "14:20", isMe: false },
            { sender: "Capt. Herman", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", text: "Penjemputan dimulai pukul 08:30 WIT di Bandara Sorong ya Rina 👍", time: "14:25", isMe: false },
            { sender: "Capt. Herman", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", text: "Salam kenal semuanya! Jangan lupa bawa sunscreen dan lotion anti nyamuk ya.", time: "14:32", isMe: false }
        ]
    },
    {
        id: "direct-provider-rajaampat",
        type: "direct",
        title: "Raja Ampat Explorer (Provider)",
        subTitle: "Customer Support & Booking Info",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        packageId: 1,
        unreadCount: 0,
        lastMessage: "Provider: Terima kasih telah memesan trip Raja Ampat bersama kami!",
        lastTime: "13:50",
        isUnlocked: true,
        members: [],
        messages: [
            { sender: "Raja Ampat Explorer", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", text: "Halo Budi! Ada yang bisa kami bantu terkait pesanan Anda?", time: "13:45", isMe: false },
            { sender: "Budi Santoso", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", text: "Halo, mau tanya apakah alat snorkeling sudah disterilkan?", time: "13:48", isMe: true },
            { sender: "Raja Ampat Explorer", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", text: "Tentu Budi, semua perlengkapan disterilkan dan disinfeksi sebelum tiap keberangkatan.", time: "13:50", isMe: false }
        ]
    }
];

// 7. Active State variables
let currentActivePackage = packagesDB[0];
let currentActiveDate = "28 Mei 2024";
let currentGuestCount = 2;
let currentBookingGuests = 2;
let isWishlistedState = false;
let selectedProvinceFilter = "Semua";
let selectedCategoryFilter = "Semua";
let currentActiveChatRoom = null;
let currentBookingInProgress = null;

// 8. Document Init & Setup
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function formatIndonesianDateStr(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${day} ${months[monthIdx]} ${year}`;
}

function updateDateDisplay(val) {
    const txtDisplay = document.getElementById('txt-home-date-display');
    if (txtDisplay) {
        txtDisplay.innerText = formatIndonesianDateStr(val);
    }
}

function getLocalTodayIso() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();

window.openCustomDateModal = function() {
    const modal = document.getElementById('custom-date-modal');
    if (!modal) return;

    const input = document.getElementById('input-home-date');
    const todayIso = getLocalTodayIso();
    const val = (input && input.value) ? input.value : todayIso;

    const parts = val.split('-');
    if (parts.length === 3) {
        currentCalendarYear = parseInt(parts[0], 10);
        currentCalendarMonth = parseInt(parts[1], 10) - 1;
    } else {
        const now = new Date();
        currentCalendarYear = now.getFullYear();
        currentCalendarMonth = now.getMonth();
    }

    modal.style.display = 'flex';
    renderCustomCalendarGrid();
};

window.closeCustomDateModal = function() {
    const modal = document.getElementById('custom-date-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.openHomeDatePicker = function() {
    window.openCustomDateModal();
};

window.changeCalendarMonth = function(delta) {
    currentCalendarMonth += delta;
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear -= 1;
    } else if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear += 1;
    }
    renderCustomCalendarGrid();
};

window.selectCustomDate = function(dateStr) {
    const homeDateInput = document.getElementById('input-home-date');
    if (homeDateInput) {
        homeDateInput.value = dateStr;
        updateDateDisplay(dateStr);
    }
    window.closeCustomDateModal();
};

window.renderCustomCalendarGrid = function() {
    const grid = document.getElementById('custom-calendar-grid');
    if (!grid) return;

    const monthsIndo = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const titleEl = document.getElementById('custom-calendar-month-title');
    if (titleEl) {
        titleEl.innerText = `${monthsIndo[currentCalendarMonth]} ${currentCalendarYear}`;
    }

    const input = document.getElementById('input-home-date');
    const todayIso = getLocalTodayIso();
    const selectedVal = (input && input.value) ? input.value : todayIso;

    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const prevMonthLastDay = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();

    let html = '';

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const prevDayNum = prevMonthLastDay - i;
        html += `<div style="padding: 6px; font-size: 11px; color: #cbd5e1; pointer-events: none; user-select: none;">${prevDayNum}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const mmStr = String(currentCalendarMonth + 1).padStart(2, '0');
        const ddStr = String(d).padStart(2, '0');
        const dateStr = `${currentCalendarYear}-${mmStr}-${ddStr}`;

        const isSelected = (dateStr === selectedVal);
        const isDisabled = (dateStr < todayIso);

        if (isDisabled) {
            html += `<div style="padding: 6px; font-size: 11px; color: #cbd5e1; background: #f8fafc; border-radius: 6px; cursor: not-allowed; opacity: 0.5; pointer-events: none; user-select: none; text-decoration: line-through;">${d}</div>`;
        } else if (isSelected) {
            html += `<div onclick="selectCustomDate('${dateStr}')" style="padding: 6px; font-size: 11px; color: white; background: #0f8b8d; border-radius: 6px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(15,139,141,0.3);">${d}</div>`;
        } else {
            html += `<div onclick="selectCustomDate('${dateStr}')" style="padding: 6px; font-size: 11px; color: #111827; border-radius: 6px; font-weight: 600; cursor: pointer; background: #ffffff;" onmouseover="this.style.background='#e6f4f4'" onmouseout="this.style.background='#ffffff'">${d}</div>`;
        }
    }

    const totalCellsSoFar = startDayOfWeek + daysInMonth;
    const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
    for (let n = 1; n <= remainingCells; n++) {
        html += `<div style="padding: 6px; font-size: 11px; color: #cbd5e1; pointer-events: none; user-select: none;">${n}</div>`;
    }

    grid.innerHTML = html;
};

function initApp() {
    const homeDateInput = document.getElementById('input-home-date');
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const localTodayIso = `${yyyy}-${mm}-${dd}`;

    if (homeDateInput) {
        homeDateInput.min = localTodayIso;
        homeDateInput.value = localTodayIso;
        homeDateInput.defaultValue = localTodayIso;
        homeDateInput.setAttribute('min', localTodayIso);
        homeDateInput.setAttribute('value', localTodayIso);

        updateDateDisplay(localTodayIso);

        const onDateChange = function() {
            if (!this.value || this.value < localTodayIso) {
                this.value = localTodayIso;
            }
            updateDateDisplay(this.value);
        };

        homeDateInput.addEventListener('change', onDateChange);
        homeDateInput.addEventListener('input', onDateChange);
    }
    fetchPackagesFromBackend();
    renderHomeScreenData();
    renderTripListData();
    renderTripDetailData();
    renderBookingFormData();
    renderBookingHistoryList();
    renderChatInbox();
    generateQRISCode();
    updateUserHeaderUI();

    // 8.1 Sidebar Navigation Buttons
    const sidebarButtons = document.querySelectorAll(".btn-screen");
    sidebarButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetScreenId = btn.getAttribute("data-target");
            switchScreen(targetScreenId);
        });
    });

    // 8.2 Phone Bottom Nav
    const bottomNavItems = document.querySelectorAll(".bottom-nav-bar .nav-item");
    bottomNavItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetScreenId = item.getAttribute("data-screen");
            if (targetScreenId) {
                switchScreen(targetScreenId);
            }
        });
    });

    // 8.3 Auth Trigger Buttons
    const loginBtns = document.querySelectorAll(".btn-login, #btn-header-login");
    loginBtns.forEach(b => b.addEventListener("click", () => openAuthModal("login")));

    // 8.4 Search Dest Trigger -> Open 38 Province Selector Modal
    const searchDestTrigger = document.getElementById("search-dest-trigger");
    if (searchDestTrigger) {
        searchDestTrigger.addEventListener("click", () => {
            openDestModal();
        });
    }

    // Search type trigger
    const searchTypeTrigger = document.getElementById("search-type-trigger");
    if (searchTypeTrigger) {
        searchTypeTrigger.addEventListener("click", () => {
            switchScreen("screen-list");
        });
    }

    // 8.5 Search Buttons
    const searchTripsBtn = document.getElementById("btn-search-trips");
    if (searchTripsBtn) {
        searchTripsBtn.addEventListener("click", () => {
            switchScreen("screen-list");
        });
    }

    const viewAllPopularBtn = document.getElementById("btn-view-all-popular");
    if (viewAllPopularBtn) {
        viewAllPopularBtn.addEventListener("click", () => {
            switchScreen("screen-list");
        });
    }

    // 8.6 Category Shortcuts on Home Screen
    renderCategoryShortcuts();

    // 8.7 Trip List Screen Events
    const listBackBtn = document.getElementById("btn-list-back");
    if (listBackBtn) {
        listBackBtn.addEventListener("click", () => {
            switchScreen("screen-home");
        });
    }
    
    // Sort dropdown
    const sortDropdown = document.querySelector(".dropdown-sort");
    if (sortDropdown) {
        sortDropdown.addEventListener("click", (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle("open");
        });
        document.addEventListener("click", () => {
            sortDropdown.classList.remove("open");
        });
    }

    const sortOptions = document.querySelectorAll(".sort-option");
    sortOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            sortOptions.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            const sortVal = opt.getAttribute("data-sort");
            const lbl = document.getElementById("selected-sort-label");
            if (lbl) lbl.innerText = sortVal;
            renderTripListData(sortVal);
        });
    });

    const listSearchInput = document.getElementById("txt-list-search");
    if (listSearchInput) {
        listSearchInput.addEventListener("input", () => {
            renderTripListData();
        });
    }

    // 8.8 Trip Detail Screen Events
    const detailBackBtn = document.getElementById("btn-detail-back");
    if (detailBackBtn) {
        detailBackBtn.addEventListener("click", () => {
            switchScreen("screen-list");
        });
    }

    // Detail Tabs
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const targetTabPaneId = btn.getAttribute("data-tab");
            
            const tabPanes = document.querySelectorAll(".tab-pane");
            tabPanes.forEach(pane => pane.classList.remove("active"));
            const targetPane = document.getElementById(targetTabPaneId);
            if (targetPane) targetPane.classList.add("active");
        });
    });

    // Guest counter detail
    const detailGuestMinus = document.getElementById("btn-detail-guest-minus");
    if (detailGuestMinus) {
        detailGuestMinus.addEventListener("click", () => {
            if (currentGuestCount > 1) {
                currentGuestCount--;
                updateDetailPriceCalculation();
            }
        });
    }

    const detailGuestPlus = document.getElementById("btn-detail-guest-plus");
    if (detailGuestPlus) {
        detailGuestPlus.addEventListener("click", () => {
            if (currentGuestCount < currentActivePackage.availableSeats) {
                currentGuestCount++;
                updateDetailPriceCalculation();
            }
        });
    }

    // Book Now Action
    const bookNowBtn = document.getElementById("btn-book-now");
    if (bookNowBtn) {
        bookNowBtn.addEventListener("click", () => {
            currentBookingGuests = currentGuestCount;
            renderBookingFormData();
            switchScreen("screen-booking");
        });
    }

    // 8.9 Booking Form Events
    const bookingBackBtn = document.getElementById("btn-booking-back");
    if (bookingBackBtn) {
        bookingBackBtn.addEventListener("click", () => {
            switchScreen("screen-detail");
        });
    }

    const autoFillBtn = document.getElementById("btn-autofill");
    if (autoFillBtn) {
        autoFillBtn.addEventListener("click", () => {
            autoFillPrimaryTraveler();
        });
    }

    const formGuestMinus = document.getElementById("btn-form-guest-minus");
    if (formGuestMinus) {
        formGuestMinus.addEventListener("click", () => {
            if (currentBookingGuests > 1) {
                currentBookingGuests--;
                renderBookingFormData();
            }
        });
    }

    const formGuestPlus = document.getElementById("btn-form-guest-plus");
    if (formGuestPlus) {
        formGuestPlus.addEventListener("click", () => {
            if (currentBookingGuests < currentActivePackage.quotaMax) {
                currentBookingGuests++;
                renderBookingFormData();
            }
        });
    }

    const submitBookingBtn = document.getElementById("btn-submit-booking");
    if (submitBookingBtn) {
        submitBookingBtn.addEventListener("click", () => {
            const randomBookingCode = "TK-2824-" + Math.floor(1000 + Math.random() * 9000);
            const totalCost = currentActivePackage.price * currentBookingGuests;
            
            const newBooking = {
                id: "BK-" + (1000 + bookingsDB.length + 1),
                bookingCode: randomBookingCode,
                packageId: currentActivePackage.id,
                packageName: currentActivePackage.name,
                destination: currentActivePackage.destination,
                schedule: currentActiveDate,
                guestsCount: currentBookingGuests,
                totalPrice: totalCost,
                status: "Menunggu Pembayaran",
                paymentDate: "-",
                paymentMethod: "QRIS GPN",
                hasGroupChat: false,
                travelers: [
                    { name: document.getElementById("val-name-0")?.value || currentUser.name, email: currentUser.email, phone: currentUser.phone }
                ]
            };

            bookingsDB.unshift(newBooking);
            currentBookingInProgress = newBooking;

            const codeLbl = document.getElementById("payment-booking-code");
            if (codeLbl) codeLbl.innerText = randomBookingCode;

            const priceLbl = document.getElementById("payment-total-price");
            if (priceLbl) priceLbl.innerText = formatIDRCurrency(totalCost);
            
            renderBookingHistoryList();
            switchScreen("screen-payment");
        });
    }

    // 8.10 Payment Screen Events & Dummy Controls
    const paymentBackBtn = document.getElementById("btn-payment-back");
    if (paymentBackBtn) {
        paymentBackBtn.addEventListener("click", () => {
            switchScreen("screen-booking");
        });
    }

    const simSuccessBtn = document.getElementById("btn-sim-success");
    if (simSuccessBtn) {
        simSuccessBtn.addEventListener("click", () => simulatePaymentSuccess());
    }

    const simFailBtn = document.getElementById("btn-sim-fail");
    if (simFailBtn) {
        simFailBtn.addEventListener("click", () => simulatePaymentCancel());
    }

    // Payment Tab Switcher
    const payTabs = document.querySelectorAll(".pay-tab");
    payTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            payTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const targetPayPaneId = tab.getAttribute("data-paytab");
            const payPanes = document.querySelectorAll(".pay-pane");
            payPanes.forEach(p => p.classList.remove("active"));
            const targetPane = document.getElementById(targetPayPaneId);
            if (targetPane) targetPane.classList.add("active");
        });
    });

    // 8.11 Chat Back Button
    const chatBackBtn = document.getElementById("btn-chat-room-back");
    if (chatBackBtn) {
        chatBackBtn.addEventListener("click", () => {
            document.getElementById("chat-room-view")?.classList.add("d-none");
            document.getElementById("chat-inbox-view")?.classList.remove("d-none");
        });
    }

    // Chat Send Button
    const sendChatBtn = document.getElementById("btn-send-message");
    if (sendChatBtn) {
        sendChatBtn.addEventListener("click", () => sendChatMessage());
    }

    const inputMsg = document.getElementById("txt-chat-message");
    if (inputMsg) {
        inputMsg.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendChatMessage();
        });
    }

    // Profile Logout Button
    const logoutBtn = document.getElementById("btn-profile-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            currentUser.isLoggedIn = false;
            updateUserHeaderUI();
            alert("Anda telah keluar akun.");
            openAuthModal("login");
        });
    }

    startPaymentTimer(23, 59, 59);
}

// 9. Helper Function: Screen Switcher & Sidebar/BottomNav Sync
function switchScreen(screenId) {
    const screens = document.querySelectorAll(".screen");
    screens.forEach(s => s.classList.remove("active"));
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add("active");
        const viewport = document.getElementById("viewport");
        if (viewport) viewport.scrollTop = 0;
    }

    const sidebarButtons = document.querySelectorAll(".btn-screen");
    sidebarButtons.forEach(btn => {
        if (btn.getAttribute("data-target") === screenId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const bottomNavItems = document.querySelectorAll(".bottom-nav-bar .nav-item");
    bottomNavItems.forEach(item => {
        const itemScreen = item.getAttribute("data-screen");
        if (itemScreen === screenId) {
            item.classList.add("active");
        } else if (screenId === "screen-detail" && itemScreen === "screen-list") {
            item.classList.add("active");
        } else if (screenId === "screen-payment" && itemScreen === "screen-booking-list") {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    if (screenId === "screen-chat") {
        renderChatInbox();
    } else if (screenId === "screen-booking-list") {
        renderBookingHistoryList();
    } else if (screenId === "screen-plan") {
        renderTripPlanScreen();
    }
}

// 10. Auth Modal Logic (Email + Google SSO)
function openAuthModal(mode = "login") {
    let authModal = document.getElementById("auth-modal");
    if (!authModal) {
        createAuthModalHTML();
        authModal = document.getElementById("auth-modal");
    }
    toggleAuthTab(mode);
    authModal.classList.add("active");
}

function closeAuthModal() {
    const authModal = document.getElementById("auth-modal");
    if (authModal) authModal.classList.remove("active");
}

function createAuthModalHTML() {
    const modalHtml = `
        <div class="modal-overlay" id="auth-modal">
            <div class="modal-card">
                <div class="modal-header">
                    <div class="header-logo">
                        <i class="fa-solid fa-globe logo-small-icon"></i>
                        <span>TripKita</span>
                    </div>
                    <button class="btn-close-modal" onclick="closeAuthModal()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                
                <div class="auth-tabs">
                    <button class="auth-tab-btn active" id="tab-auth-login" onclick="toggleAuthTab('login')">Masuk</button>
                    <button class="auth-tab-btn" id="tab-auth-register" onclick="toggleAuthTab('register')">Daftar Akun</button>
                </div>

                <div class="modal-body">
                    <button class="btn-google-sso" onclick="handleGoogleAuth()">
                        <svg width="18" height="18" viewBox="0 0 18 18">
                            <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
                            <path fill="#FBBC05" d="M3.87 10.78c-.18-.53-.28-1.09-.28-1.78s.1-1.25.28-1.78L.97 4.96C.35 6.18 0 7.55 0 9s.35 2.82.97 4.04l2.9-2.26z"/>
                            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.26C4.59 5.05 6.62 3.58 9 3.58z"/>
                        </svg>
                        <span id="txt-google-btn">Masuk dengan Google</span>
                    </button>

                    <div class="divider-or">
                        <span>atau gunakan email</span>
                    </div>

                    <form id="auth-form" onsubmit="handleFormAuth(event)">
                        <div class="input-group" id="group-reg-name" style="display: none;">
                            <label>Nama Lengkap</label>
                            <div class="input-wrap">
                                <i class="fa-regular fa-user"></i>
                                <input type="text" id="auth-name" placeholder="Nama Anda">
                            </div>
                        </div>

                        <div class="input-group mt-12">
                            <label>Alamat Email</label>
                            <div class="input-wrap">
                                <i class="fa-regular fa-envelope"></i>
                                <input type="email" id="auth-email" placeholder="nama@email.com" required value="budi.santoso@gmail.com">
                            </div>
                        </div>

                        <div class="input-group mt-12">
                            <label>Kata Sandi</label>
                            <div class="input-wrap">
                                <i class="fa-solid fa-lock"></i>
                                <input type="password" id="auth-password" placeholder="••••••••" required value="123456">
                            </div>
                        </div>

                        <button type="submit" class="btn-primary w-100 mt-20" id="btn-auth-submit">
                            <i class="fa-solid fa-right-to-bracket"></i> Masuk Ke TripKita
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function toggleAuthTab(mode) {
    const isLogin = mode === 'login';
    const tabLogin = document.getElementById("tab-auth-login");
    const tabReg = document.getElementById("tab-auth-register");
    const groupName = document.getElementById("group-reg-name");
    const btnSubmit = document.getElementById("btn-auth-submit");
    const txtGoogle = document.getElementById("txt-google-btn");

    if (isLogin) {
        tabLogin?.classList.add("active");
        tabReg?.classList.remove("active");
        if (groupName) groupName.style.display = "none";
        if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Masuk Ke TripKita`;
        if (txtGoogle) txtGoogle.innerText = "Masuk dengan Google";
    } else {
        tabReg?.classList.add("active");
        tabLogin?.classList.remove("active");
        if (groupName) groupName.style.display = "block";
        if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-user-plus"></i> Daftar Akun Baru`;
        if (txtGoogle) txtGoogle.innerText = "Daftar dengan Google";
    }
}

function handleGoogleAuth() {
    currentUser = {
        isLoggedIn: true,
        name: "Budi Santoso (Google)",
        email: "budi.google@gmail.com",
        phone: "081234567890",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
        loginMethod: "Google SSO"
    };
    updateUserHeaderUI();
    closeAuthModal();
    alert("Berhasil masuk dengan akun Google!");
}

function handleFormAuth(e) {
    e.preventDefault();
    const emailVal = document.getElementById("auth-email").value;
    const nameVal = document.getElementById("auth-name")?.value || "Budi Santoso";
    
    currentUser = {
        isLoggedIn: true,
        name: nameVal,
        email: emailVal,
        phone: "081234567890",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
        loginMethod: "Email"
    };
    updateUserHeaderUI();
    closeAuthModal();
    alert("Berhasil masuk ke TripKita!");
}

function updateUserHeaderUI() {
    const btnLoginHeader = document.querySelector(".btn-login");
    if (btnLoginHeader) {
        if (currentUser.isLoggedIn) {
            btnLoginHeader.innerHTML = `<img src="${currentUser.avatar}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;"> ${currentUser.name.split(' ')[0]}`;
            btnLoginHeader.style.background = "#e6f4f4";
            btnLoginHeader.style.color = "#0f8b8d";
        } else {
            btnLoginHeader.innerHTML = `<i class="fa-regular fa-user"></i> Masuk`;
            btnLoginHeader.style.background = "white";
            btnLoginHeader.style.color = "#1f2937";
        }
    }
}

// 11. Modal 38 Provinsi Indonesia Selector
function openDestModal() {
    let destModal = document.getElementById("dest-modal");
    if (!destModal) {
        createDestModalHTML();
        destModal = document.getElementById("dest-modal");
    }
    renderProvincesGrid();
    destModal.classList.add("active");
}

function closeDestModal() {
    const destModal = document.getElementById("dest-modal");
    if (destModal) destModal.classList.remove("active");
}

function createDestModalHTML() {
    const modalHtml = `
        <div class="modal-overlay" id="dest-modal">
            <div class="modal-card modal-large">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-map-location-dot text-teal"></i> Pilih Provinsi Destinasi (38 Provinsi)</h3>
                    <button class="btn-close-modal" onclick="closeDestModal()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="p-16">
                    <div class="search-wrap-inner" style="display:flex;align-items:center;background:#f3f4f6;border-radius:12px;padding:0 12px;">
                        <i class="fa-solid fa-magnifying-glass" style="color:#9ca3af;"></i>
                        <input type="text" id="txt-prov-search" placeholder="Cari provinsi di Indonesia..." style="border:none;background:none;padding:12px 8px;width:100%;font-size:12px;" oninput="filterProvincesGrid()">
                    </div>
                </div>
                <div class="modal-body prov-grid-container" id="prov-grid-list">
                    <!-- Populated by JS -->
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function renderProvincesGrid() {
    const container = document.getElementById("prov-grid-list");
    if (!container) return;

    container.innerHTML = `
        <div class="prov-chip ${selectedProvinceFilter === 'Semua' ? 'active' : ''}" onclick="selectProvince('Semua')">
            <i class="fa-solid fa-globe"></i> Semua Provinsi
        </div>
    `;

    INDONESIA_PROVINCES.forEach(prov => {
        const isActive = selectedProvinceFilter === prov;
        container.insertAdjacentHTML("beforeend", `
            <div class="prov-chip ${isActive ? 'active' : ''}" onclick="selectProvince('${prov}')">
                <i class="fa-solid fa-location-dot text-teal"></i> ${prov}
            </div>
        `);
    });
}

function filterProvincesGrid() {
    const searchVal = document.getElementById("txt-prov-search").value.toLowerCase();
    const container = document.getElementById("prov-grid-list");
    container.innerHTML = `
        <div class="prov-chip ${selectedProvinceFilter === 'Semua' ? 'active' : ''}" onclick="selectProvince('Semua')">
            <i class="fa-solid fa-globe"></i> Semua Provinsi
        </div>
    `;

    INDONESIA_PROVINCES.filter(p => p.toLowerCase().includes(searchVal)).forEach(prov => {
        const isActive = selectedProvinceFilter === prov;
        container.insertAdjacentHTML("beforeend", `
            <div class="prov-chip ${isActive ? 'active' : ''}" onclick="selectProvince('${prov}')">
                <i class="fa-solid fa-location-dot text-teal"></i> ${prov}
            </div>
        `);
    });
}

function selectProvince(provName) {
    selectedProvinceFilter = provName;
    const destLbl = document.getElementById("txt-home-dest");
    if (destLbl) destLbl.innerText = provName === 'Semua' ? 'Seluruh Indonesia' : provName;
    closeDestModal();
    renderTripListData();
}

// 12. Render Kategori Shortcuts di Beranda
function renderCategoryShortcuts() {
    const container = document.querySelector(".categories-shortcuts");
    if (!container) return;

    container.innerHTML = "";
    TRIP_CATEGORIES.slice(1, 6).forEach(cat => {
        container.insertAdjacentHTML("beforeend", `
            <div class="shortcut-item" data-category="${cat.name}" onclick="setCategoryFilter('${cat.name}')">
                <div class="icon-wrap bg-teal-light"><i class="${cat.icon}"></i></div>
                <span>${cat.name.split(' ')[0]}</span>
            </div>
        `);
    });
}

function setCategoryFilter(catName) {
    selectedCategoryFilter = catName;
    renderTripListData();
    switchScreen("screen-list");
}

// Helper functions needed by card renderers
function formatIDRCurrency(amount) {
    if (typeof amount !== 'number') amount = Number(amount) || 0;
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function toggleWishlist(btn) {
    if (!btn) return;
    const icon = btn.querySelector("i");
    if (icon) {
        if (icon.classList.contains("fa-regular")) {
            icon.classList.remove("fa-regular");
            icon.classList.add("fa-solid");
            icon.style.color = "#ef4444";
        } else {
            icon.classList.remove("fa-solid");
            icon.classList.add("fa-regular");
            icon.style.color = "";
        }
    }
}

function viewTripDetail(id) {
    const pkg = packagesDB.find(p => p.id === id);
    if (pkg) {
        currentActivePackage = pkg;
        if (typeof renderTripDetailData === 'function') renderTripDetailData();
        if (typeof switchScreen === 'function') switchScreen("screen-detail");
    }
}

function enableDragToScroll(container) {
    if (!container) return;
    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    container.addEventListener('mouseleave', () => {
        isDown = false;
    });
    container.addEventListener('mouseup', () => {
        isDown = false;
    });
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 1.5;
        container.scrollLeft = scrollLeft - walk;
    });
}

// 13. Render Home Screen 3 Sections (Presisi Gambar 1)
function renderHomeScreenData() {
    const renderCardCompact = (pkg) => `
        <div class="trip-card-compact" onclick="viewTripDetail(${pkg.id})">
            <div style="height: 95px; width: 100%; position: relative; background: #f3f4f6;">
                <img src="${pkg.images[0]}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600'">
                <span style="position: absolute; top: 5px; left: 5px; background: #0f8b8d; color: white; font-size: 7.5px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">${pkg.tripType} • ${pkg.category}</span>
                <button class="btn-wishlist" onclick="event.stopPropagation(); toggleWishlist(this);" style="position: absolute; top: 5px; right: 5px; background: rgba(255,255,255,0.85); border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 9px; cursor: pointer;"><i class="fa-regular fa-heart"></i></button>
            </div>
            <div style="padding: 7px 8px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h4 style="font-size: 10.5px; margin: 0 0 2px 0; font-weight: 800; color: #111827; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${pkg.name}">${pkg.name}</h4>
                    <p style="font-size: 8.5px; color: #6b7280; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><i class="fa-solid fa-location-dot" style="color: #0f8b8d;"></i> ${pkg.destination}</p>
                </div>
                
                <div style="display: flex; gap: 3px; margin: 3px 0; flex-wrap: wrap; height: 18px; overflow: hidden;">
                    ${(pkg.highlights || []).slice(0, 2).map(h => `<span style="background: #e6f4f4; color: #0f8b8d; font-size: 7px; font-weight: 600; padding: 1px 4px; border-radius: 3px; white-space: nowrap;">${h}</span>`).join('')}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f3f4f6; padding-top: 4px; margin-top: 2px;">
                    <span style="font-size: 8.5px; color: #d97706; font-weight: 800;">⭐ ${pkg.rating} <span style="color: #6b7280; font-weight: normal;">(${pkg.reviewCount})</span></span>
                    <strong style="font-size: 9.5px; color: #0f8b8d;">${formatIDRCurrency(pkg.price)}</strong>
                </div>
            </div>
        </div>
    `;

    const renderTwoSlideCarousel = (packages) => {
        const slide1 = packages.slice(0, 2).map(renderCardCompact).join('');
        const slide2 = packages.slice(2, 4).map(renderCardCompact).join('');
        return `
            <div class="scroll-slide">${slide1}</div>
            ${slide2 ? `<div class="scroll-slide">${slide2}</div>` : ''}
        `;
    };

    // Section 1: Trip Populer (Open Trip) - Max 4 Rekomendasi (2 Slides)
    const popContainer = document.getElementById("popular-trips-scroll");
    if (popContainer) {
        const openTrips = packagesDB.filter(p => p.tripType === 'Open Trip').slice(0, 4);
        popContainer.innerHTML = renderTwoSlideCarousel(openTrips);
        enableDragToScroll(popContainer);
    }

    // Section 2: Private Trip & Honeymoon Spesial - Max 4 Rekomendasi (2 Slides)
    const privContainer = document.getElementById("private-honeymoon-scroll");
    if (privContainer) {
        const privTrips = packagesDB.filter(p => p.tripType === 'Private Trip' || p.tripType === 'Honeymoon').slice(0, 4);
        privContainer.innerHTML = renderTwoSlideCarousel(privTrips);
        enableDragToScroll(privContainer);
    }

    // Section 3: Family & Corporate Gathering - Max 4 Rekomendasi (2 Slides)
    const famContainer = document.getElementById("family-corporate-scroll");
    if (famContainer) {
        const famTrips = packagesDB.filter(p => p.tripType === 'Family' || p.tripType === 'Corporate').slice(0, 4);
        famContainer.innerHTML = renderTwoSlideCarousel(famTrips);
        enableDragToScroll(famContainer);
    }
}

// 14. Render Trip List Screen with Search + Province + Category Filters (Presisi Gambar 2)
function renderTripListData(sortBy = "Rekomendasi") {
    let filtered = [...packagesDB];

    const destFilter = document.getElementById("select-home-dest")?.value;
    if (destFilter) {
        filtered = filtered.filter(p => p.destination.toLowerCase().includes(destFilter.toLowerCase()) || p.province.toLowerCase().includes(destFilter.toLowerCase()));
    }

    const typeFilter = document.getElementById("select-home-type")?.value;
    if (typeFilter && typeFilter !== 'Semua Tipe') {
        filtered = filtered.filter(p => p.tripType.toLowerCase().includes(typeFilter.toLowerCase()));
    }

    const catFilter = document.getElementById("select-home-category")?.value;
    if (catFilter && catFilter !== 'Semua Kategori') {
        filtered = filtered.filter(p => p.category.toLowerCase().includes(catFilter.toLowerCase()));
    }

    if (sortBy === "Harga Terendah") {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "Rating Tertinggi") {
        filtered.sort((a, b) => b.rating - a.rating);
    }

    const container = document.getElementById("trips-vertical-list");
    if (!container) return;

    const resCount = document.getElementById("lbl-result-count");
    if (resCount) resCount.innerText = `Menampilkan ${filtered.length} paket wisata`;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-result" style="text-align: center; padding: 40px 0; color: #6b7280;">
                <i class="fa-solid fa-search-minus" style="font-size: 36px; margin-bottom: 8px; color: #ccc;"></i>
                <h4 style="color: #111827; margin: 0 0 4px 0; font-size: 13px;">Trip tidak ditemukan</h4>
                <p style="font-size: 10px; margin: 0;">Coba atur ulang kata kunci atau filter destinasi/kategori.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(pkg => `
        <div class="trip-card-v2" onclick="viewTripDetail(${pkg.id})" style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
            <div style="display: flex; gap: 10px; padding: 10px;">
                <div style="width: 100px; height: 85px; border-radius: 8px; overflow: hidden; position: relative; flex-shrink: 0;">
                    <img src="${pkg.images[0]}" style="width: 100%; height: 100%; object-fit: cover;">
                    <button class="btn-wishlist" onclick="event.stopPropagation(); toggleWishlist(this);" style="position: absolute; top: 4px; right: 4px; background: rgba(255,255,255,0.85); border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 9px; cursor: pointer;"><i class="fa-regular fa-heart"></i></button>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px;">
                            <span style="background: #0f8b8d; color: white; font-size: 8px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">${pkg.tripType} • ${pkg.category}</span>
                            <div style="text-align: right;">
                                <span style="font-size: 8px; color: #6b7280; display: block;">Mulai dari</span>
                                <strong style="font-size: 11px; color: #0f8b8d;">${formatIDRCurrency(pkg.price)} <span style="font-size: 8px; font-weight: normal; color: #6b7280;">/orang</span></strong>
                            </div>
                        </div>
                        <h4 style="font-size: 11px; margin: 3px 0 1px 0; font-weight: 800; color: #111827;">${pkg.name}</h4>
                        <p style="font-size: 8px; color: #6b7280; margin: 0;"><i class="fa-solid fa-location-dot" style="color: #0f8b8d;"></i> ${pkg.destination}</p>
                    </div>
                    
                    <div style="display: flex; gap: 3px; flex-wrap: wrap; margin-top: 3px;">
                        ${(pkg.highlights || []).slice(0, 3).map(h => `<span style="background: #e6f4f4; color: #0f8b8d; font-size: 7px; font-weight: 600; padding: 1px 4px; border-radius: 3px;">${h}</span>`).join('')}
                    </div>
                </div>
            </div>

            <div style="padding: 6px 10px; background: #f9fafb; border-top: 1px dashed #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #4b5563;">
                <div>
                    <span style="color: #d97706; font-weight: 800;">⭐ ${pkg.rating}</span> <span style="color: #6b7280;">(${pkg.reviewCount} ulasan)</span> | <span style="color: #0f8b8d; font-weight: bold;">Sisa ${pkg.availableSeats} seat</span>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button onclick="event.stopPropagation(); alert('Link tersalin!');" style="background: white; border: 1px solid #d1d5db; color: #374151; padding: 3px 6px; border-radius: 5px; font-size: 8px; font-weight: bold; cursor: pointer;"><i class="fa-solid fa-share-nodes"></i> Bagikan</button>
                    <button style="background: #0f8b8d; border: none; color: white; padding: 3px 8px; border-radius: 5px; font-size: 8px; font-weight: bold; cursor: pointer;">Lihat Detail ></button>
                </div>
            </div>
        </div>
    `).join('');
}

// 15. Render Trip Detail Screen
function viewTripDetail(packageId) {
    const pkg = packagesDB.find(p => p.id === packageId);
    if (pkg) {
        currentActivePackage = pkg;
        currentGuestCount = pkg.minParticipants;
        renderTripDetailData();
        switchScreen("screen-detail");
    }
}

function renderTripDetailData() {
    const pkg = currentActivePackage;
    
    const activeImg = document.getElementById("detail-active-img");
    if (activeImg) activeImg.src = pkg.images[0];

    const carInd = document.getElementById("carousel-indicator");
    if (carInd) carInd.innerText = `1 / ${pkg.images.length || 1}`;
    
    const dotsContainer = document.getElementById("carousel-dots-list");
    if (dotsContainer) {
        dotsContainer.innerHTML = "";
        pkg.images.forEach((img, idx) => {
            dotsContainer.insertAdjacentHTML("beforeend", `<span class="dot ${idx === 0 ? 'active' : ''}"></span>`);
        });
    }

    const badge = document.getElementById("detail-package-badge");
    if (badge) badge.innerText = pkg.tripType.toUpperCase();

    const title = document.getElementById("detail-package-title");
    if (title) title.innerText = pkg.name;

    const loc = document.getElementById("detail-package-location");
    if (loc) loc.innerText = pkg.destination;

    const rat = document.getElementById("detail-package-rating");
    if (rat) rat.innerText = pkg.rating;

    const rev = document.getElementById("detail-package-reviews");
    if (rev) rev.innerText = `(${pkg.reviewCount} ulasan)`;

    const dur = document.getElementById("detail-summary-duration");
    if (dur) dur.innerText = pkg.duration;

    const stype = document.getElementById("detail-summary-type");
    if (stype) stype.innerText = pkg.tripType;

    const smin = document.getElementById("detail-summary-min");
    if (smin) smin.innerText = `${pkg.minParticipants} Orang`;

    const sseats = document.getElementById("detail-summary-seats");
    if (sseats) sseats.innerText = `${pkg.availableSeats} Seat`;

    const desc = document.getElementById("detail-desc-text");
    if (desc) desc.innerText = pkg.description;
    
    const itineraryWrap = document.getElementById("detail-itinerary-list");
    if (itineraryWrap) {
        itineraryWrap.innerHTML = "";
        if (pkg.itinerary && pkg.itinerary.length > 0) {
            pkg.itinerary.forEach(it => itineraryWrap.insertAdjacentHTML("beforeend", `<li>${it}</li>`));
        } else {
            itineraryWrap.innerHTML = "<p class='no-data-tab'>Jadwal perjalanan disesuaikan dengan paket.</p>";
        }
    }

    const facWrap = document.getElementById("detail-facilities-list");
    if (facWrap) {
        facWrap.innerHTML = "";
        if (pkg.facilities && pkg.facilities.length > 0) {
            pkg.facilities.forEach(fac => facWrap.insertAdjacentHTML("beforeend", `<span><i class="fa-solid fa-check text-teal"></i> ${fac}</span>`));
        }
    }

    const guestCountLbl = document.getElementById("detail-guest-count");
    if (guestCountLbl) guestCountLbl.innerText = `${currentGuestCount} Orang`;

    updateDetailPriceCalculation();
}

function updateDetailPriceCalculation() {
    const guestCountLbl = document.getElementById("detail-guest-count");
    if (guestCountLbl) guestCountLbl.innerText = `${currentGuestCount} Orang`;

    const totalCost = currentActivePackage.price * currentGuestCount;
    const btmPrice = document.getElementById("detail-bottom-price");
    if (btmPrice) btmPrice.innerText = formatIDRCurrency(totalCost);
}

// 16. Render Booking Form Screen
function renderBookingFormData() {
    const pkg = currentActivePackage;
    
    const bimg = document.getElementById("booking-pkg-img");
    if (bimg) bimg.src = pkg.images[0];

    const bbadge = document.getElementById("booking-pkg-badge");
    if (bbadge) bbadge.innerText = pkg.tripType.toUpperCase();

    const btitle = document.getElementById("booking-pkg-title");
    if (btitle) btitle.innerText = pkg.name;

    const bloc = document.getElementById("booking-pkg-location");
    if (bloc) bloc.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${pkg.destination.split(',')[0]}`;

    const brat = document.getElementById("booking-pkg-rating");
    if (brat) brat.innerText = pkg.rating;

    const bdur = document.getElementById("booking-pkg-duration");
    if (bdur) bdur.innerHTML = `<i class="fa-regular fa-clock"></i> ${pkg.duration}`;

    const fguest = document.getElementById("form-guest-count");
    if (fguest) fguest.innerText = `${currentBookingGuests} Orang`;

    const formsContainer = document.getElementById("passenger-forms-container");
    if (formsContainer) {
        formsContainer.innerHTML = "";

        for (let i = 0; i < currentBookingGuests; i++) {
            const isFirst = i === 0;
            const accordionHtml = `
                <div class="passenger-form-card ${isFirst ? 'active' : ''}">
                    <div class="accordion-bar" onclick="toggleFormAccordion(this)">
                        <div class="acc-title-col">
                            <span class="num-badge">${i + 1}</span>
                            <strong>Peserta ${i + 1}</strong>
                            ${isFirst ? '<span class="badge-type" style="padding: 2px 6px; font-size: 9px; margin-left: 6px;">Utama</span>' : ''}
                        </div>
                        <i class="fa-solid ${isFirst ? 'fa-chevron-up' : 'fa-chevron-down'} acc-arrow"></i>
                    </div>
                    <div class="form-body">
                        <div class="input-group">
                            <label>Nama Lengkap</label>
                            <div class="input-wrap">
                                <i class="fa-regular fa-user"></i>
                                <input type="text" placeholder="Contoh: Budi Santoso" class="in-fullname" id="val-name-${i}">
                            </div>
                        </div>
                        <div class="input-group">
                            <label>Email</label>
                            <div class="input-wrap">
                                <i class="fa-regular fa-envelope"></i>
                                <input type="email" placeholder="Contoh: budi@email.com" class="in-email" id="val-email-${i}">
                            </div>
                        </div>
                        <div class="input-group">
                            <label>No. WhatsApp</label>
                            <div class="input-wrap">
                                <i class="fa-solid fa-mobile-screen-button"></i>
                                <input type="tel" placeholder="Contoh: 081234567890" class="in-phone" id="val-phone-${i}">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            formsContainer.insertAdjacentHTML("beforeend", accordionHtml);
        }
    }

    const sdate = document.getElementById("summary-trip-date");
    if (sdate) sdate.innerText = currentActiveDate;

    const sguests = document.getElementById("summary-guests-count");
    if (sguests) sguests.innerText = `${currentBookingGuests} Orang`;

    const sunit = document.getElementById("summary-unit-price");
    if (sunit) sunit.innerText = formatIDRCurrency(pkg.price);
    
    const totalCost = pkg.price * currentBookingGuests;
    const stotal = document.getElementById("summary-total-price");
    if (stotal) stotal.innerText = formatIDRCurrency(totalCost);

    const bbottom = document.getElementById("booking-bottom-price");
    if (bbottom) bbottom.innerText = formatIDRCurrency(totalCost);
}

function autoFillPrimaryTraveler() {
    const valName = document.getElementById("val-name-0");
    if (valName) valName.value = currentUser.name;

    const valEmail = document.getElementById("val-email-0");
    if (valEmail) valEmail.value = currentUser.email;

    const valPhone = document.getElementById("val-phone-0");
    if (valPhone) valPhone.value = currentUser.phone;

    alert("Data Traveler Utama Berhasil Terisi!");
}

function toggleFormAccordion(barElement) {
    const parentCard = barElement.parentElement;
    const arrow = barElement.querySelector(".acc-arrow");
    const isCurrentlyActive = parentCard.classList.contains("active");
    
    document.querySelectorAll(".passenger-form-card").forEach(c => {
        c.classList.remove("active");
        c.querySelector(".acc-arrow").className = "fa-solid fa-chevron-down acc-arrow";
    });

    if (!isCurrentlyActive) {
        parentCard.classList.add("active");
        arrow.className = "fa-solid fa-chevron-up acc-arrow";
    }
}

// 17. Dummy Payment Simulation Logic (Lunas & Cancel)
function simulatePaymentSuccess() {
    const targetBooking = currentBookingInProgress || bookingsDB[0];
    if (!targetBooking) return;

    targetBooking.status = "Lunas";
    targetBooking.paymentDate = new Date().toLocaleString("id-ID");

    unlockGroupChatForBooking(targetBooking);

    const pendingState = document.getElementById("verify-pending-state");
    const successState = document.getElementById("verify-success-state");
    if (pendingState) pendingState.classList.add("d-none");
    if (successState) successState.classList.remove("d-none");

    renderBookingHistoryList();
    renderChatInbox();

    alert(`🎉 PEMBAYARAN BERHASIL (LUNAS)!\n\nBooking: ${targetBooking.bookingCode}\nStatus: Lunas\n\nGroup Chat Trip telah OTOMATIS AKTIF! Anda sekarang dapat berkomunikasi dengan Tour Guide dan peserta lain.`);
    switchScreen("screen-chat");
}

function simulatePaymentCancel() {
    const targetBooking = currentBookingInProgress || bookingsDB[0];
    if (!targetBooking) return;

    targetBooking.status = "Dibatalkan";
    targetBooking.paymentDate = new Date().toLocaleString("id-ID");

    renderBookingHistoryList();

    alert(`⚠️ PESANAN DIBATALKAN!\n\nBooking: ${targetBooking.bookingCode}\nStatus: Dibatalkan.`);
    switchScreen("screen-booking-list");
}

function unlockGroupChatForBooking(booking) {
    let existingRoom = chatRoomsDB.find(r => r.packageId === booking.packageId && r.type === "group");
    if (existingRoom) {
        existingRoom.isUnlocked = true;
    } else {
        const pkg = packagesDB.find(p => p.id === booking.packageId) || packagesDB[0];
        const newGroupRoom = {
            id: `group-${pkg.id}-${Date.now()}`,
            type: "group",
            title: `Group Chat: ${pkg.name}`,
            subTitle: `Trip: ${booking.schedule} • ${booking.guestsCount} Peserta`,
            image: pkg.images[0],
            packageId: pkg.id,
            unreadCount: 1,
            lastMessage: "System: Pembayaran dikonfirmasi! Anda resmi bergabung di grup.",
            lastTime: "Baru saja",
            isUnlocked: true,
            members: [
                { name: "Tour Guide Herman", role: "Guide", avatar: pkg.providerAvatar },
                { name: `${currentUser.name} (Anda)`, role: "Peserta", avatar: currentUser.avatar }
            ],
            messages: [
                { sender: "System", text: `Selamat bergabung di Group Chat Trip ${pkg.name}! Pembayaran Anda telah dikonfirmasi LUNAS.`, time: "Baru saja", isSystem: true },
                { sender: "Tour Guide Herman", avatar: pkg.providerAvatar, text: `Selamat datang ${currentUser.name}! Silakan sapa peserta lainnya dan tanyakan jika ada info yang kurang jelas.`, time: "Baru saja", isMe: false }
            ]
        };
        chatRoomsDB.unshift(newGroupRoom);
    }
}

// 18. Render Booking History List Screen
function renderBookingHistoryList(filterStatus = "Semua") {
    const container = document.getElementById("booking-history-container");
    if (!container) return;

    let filtered = bookingsDB;
    if (filterStatus !== "Semua") {
        filtered = bookingsDB.filter(b => b.status === filterStatus);
    }

    container.innerHTML = "";
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-result" style="text-align: center; padding: 40px 0; color: #9ca3af;">
                <i class="fa-solid fa-receipt" style="font-size: 44px; margin-bottom: 12px; color: #cbd5e1;"></i>
                <h4 style="color: #334155;">Belum ada pesanan</h4>
                <p style="font-size: 11px;">Silakan buat pesanan trip impian Anda terlebih dahulu.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(b => {
        let statusBadgeClass = "badge-pending";
        if (b.status === "Lunas") statusBadgeClass = "badge-success";
        if (b.status === "Dibatalkan") statusBadgeClass = "badge-danger";

        const itemHtml = `
            <div class="booking-history-card">
                <div class="history-head">
                    <span class="code">${b.bookingCode}</span>
                    <span class="status-badge ${statusBadgeClass}">${b.status}</span>
                </div>
                <div class="history-body">
                    <h4>${b.packageName}</h4>
                    <p class="meta"><i class="fa-solid fa-location-dot"></i> ${b.destination}</p>
                    <p class="meta"><i class="fa-regular fa-calendar-days"></i> Tanggal Trip: <strong>${b.schedule}</strong></p>
                    <p class="meta"><i class="fa-solid fa-users"></i> ${b.guestsCount} Peserta</p>
                </div>
                <div class="history-footer">
                    <div class="total">
                        <span>Total:</span>
                        <strong>${formatIDRCurrency(b.totalPrice)}</strong>
                    </div>
                    <div class="action-btns">
                        ${b.status === 'Lunas' ? `
                            <button class="btn-sm bg-teal text-white" disabled>Lunas</button>
                        ` : b.status === 'Menunggu Pembayaran' ? `
                            <button class="btn-sm bg-green text-white" onclick="simulatePaymentSuccess()">
                                <i class="fa-solid fa-check"></i> Uji Lunas
                            </button>
                            <button class="btn-sm bg-red text-white" onclick="simulatePaymentCancel()">
                                <i class="fa-solid fa-xmark"></i> Cancel
                            </button>
                        ` : `
                            <button class="btn-sm bg-gray" disabled>Dibatalkan</button>
                        `}
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", itemHtml);
    });
}

function openTripGroupChatByPackage(packageId) {
    const room = chatRoomsDB.find(r => r.packageId === packageId && r.type === "group");
    if (room) {
        switchScreen("screen-chat");
        openChatRoom(room.id);
    } else {
        alert("Group chat sedang disiapkan untuk trip ini.");
    }
}

// 19. Render Interactive Chat Screen (Group Chat + Direct Chat Provider)
function renderChatInbox() {
    const container = document.getElementById("chat-inbox-list");
    if (!container) return;

    const availableRooms = chatRoomsDB.filter(r => r.type === "direct" || r.isUnlocked);

    container.innerHTML = `
        <div class="chat-tab-bar" style="display:flex;gap:8px;padding:0 16px 12px 16px;border-bottom:1px solid #f3f4f6;">
            <button class="chat-filter-tab active" onclick="filterChatType('all', this)">Semua Pesan</button>
            <button class="chat-filter-tab" onclick="filterChatType('group', this)">👥 Group Chat Trip</button>
            <button class="chat-filter-tab" onclick="filterChatType('direct', this)">💬 Direct Provider</button>
        </div>
        <div id="chat-rooms-vertical-list"></div>
    `;

    renderChatRoomsList(availableRooms);
}

function renderChatRoomsList(rooms) {
    const innerContainer = document.getElementById("chat-rooms-vertical-list");
    if (!innerContainer) return;

    innerContainer.innerHTML = "";
    if (rooms.length === 0) {
        innerContainer.innerHTML = `
            <div class="no-chat-state" style="text-align:center;padding:40px 16px;color:#9ca3af;">
                <i class="fa-regular fa-comments" style="font-size:44px;margin-bottom:12px;color:#cbd5e1;"></i>
                <h4 style="color:#334155;">Belum Ada Group Chat</h4>
                <p style="font-size:11px;margin-top:4px;">Group Chat Trip akan otomatis terbuka setelah Anda menyelesaikan pembayaran paket trip (Status Lunas).</p>
            </div>
        `;
        return;
    }

    rooms.forEach(r => {
        const itemHtml = `
            <div class="chat-item-row" onclick="openChatRoom('${r.id}')" style="display:flex;align-items:center;padding:12px 16px;gap:12px;border-bottom:1px solid #f3f4f6;cursor:pointer;background:white;">
                <div class="avatar-box" style="position:relative;">
                    <img src="${r.image}" alt="${r.title}" style="width:44px;height:44px;border-radius:${r.type === 'group' ? '12px' : '50%'};object-fit:cover;">
                    ${r.type === 'group' ? '<span style="position:absolute;bottom:-2px;right:-2px;background:#0f8b8d;color:white;font-size:8px;padding:1px 3px;border-radius:4px;font-weight:bold;">GROUP</span>' : ''}
                </div>
                <div class="chat-info" style="flex:1;overflow:hidden;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <h4 style="font-size:12px;color:#1f2937;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold;">${r.title}</h4>
                        <span style="font-size:9px;color:#9ca3af;">${r.lastTime}</span>
                    </div>
                    <p style="font-size:10px;color:#6b7280;margin:2px 0 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.lastMessage}</p>
                </div>
            </div>
        `;
        innerContainer.insertAdjacentHTML("beforeend", itemHtml);
    });
}

function filterChatType(type, tabElem) {
    document.querySelectorAll(".chat-filter-tab").forEach(t => t.classList.remove("active"));
    tabElem.classList.add("active");

    let filtered = chatRoomsDB.filter(r => r.type === "direct" || r.isUnlocked);
    if (type === "group") filtered = filtered.filter(r => r.type === "group");
    if (type === "direct") filtered = filtered.filter(r => r.type === "direct");

    renderChatRoomsList(filtered);
}

function openChatRoom(roomId) {
    const room = chatRoomsDB.find(r => r.id === roomId);
    if (!room) return;

    currentActiveChatRoom = room;

    const inboxView = document.getElementById("chat-inbox-view");
    if (inboxView) inboxView.classList.add("d-none");

    const roomView = document.getElementById("chat-room-view");
    if (roomView) roomView.classList.remove("d-none");

    const avatar = document.getElementById("chat-room-avatar");
    if (avatar) avatar.src = room.image;

    const name = document.getElementById("chat-room-name");
    if (name) name.innerText = room.title;

    renderChatMessages();
}

function renderChatMessages() {
    if (!currentActiveChatRoom) return;

    const messagesContainer = document.getElementById("chat-messages-container");
    if (!messagesContainer) return;

    messagesContainer.innerHTML = "";

    currentActiveChatRoom.messages.forEach(msg => {
        if (msg.isSystem) {
            messagesContainer.insertAdjacentHTML("beforeend", `
                <div class="chat-msg-system" style="text-align:center;margin:8px 0;">
                    <span style="background:#e0f2fe;color:#0369a1;font-size:10px;padding:4px 10px;border-radius:12px;display:inline-block;">${msg.text}</span>
                </div>
            `);
        } else if (msg.isMe) {
            messagesContainer.insertAdjacentHTML("beforeend", `
                <div class="chat-msg-row my-msg" style="display:flex;justify-content:flex-end;margin-bottom:8px;">
                    <div class="msg-bubble" style="background:#0f8b8d;color:white;padding:8px 12px;border-radius:16px 16px 2px 16px;max-width:75%;font-size:11px;">
                        <p style="margin:0;line-height:1.4;">${msg.text}</p>
                        <span style="font-size:8px;color:rgba(255,255,255,0.7);display:block;text-align:right;margin-top:2px;">${msg.time}</span>
                    </div>
                </div>
            `);
        } else {
            messagesContainer.insertAdjacentHTML("beforeend", `
                <div class="chat-msg-row other-msg" style="display:flex;gap:8px;margin-bottom:8px;align-items:flex-end;">
                    <img src="${msg.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
                    <div class="msg-bubble" style="background:white;color:#1f2937;padding:8px 12px;border-radius:16px 16px 16px 2px;max-width:75%;font-size:11px;border:1px solid #e5e7eb;">
                        <span style="font-weight:bold;font-size:9px;color:#0f8b8d;display:block;margin-bottom:2px;">${msg.sender}</span>
                        <p style="margin:0;line-height:1.4;">${msg.text}</p>
                        <span style="font-size:8px;color:#9ca3af;display:block;text-align:right;margin-top:2px;">${msg.time}</span>
                    </div>
                </div>
            `);
        }
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendChatMessage() {
    const inputElem = document.getElementById("txt-chat-message");
    if (!inputElem || !inputElem.value.trim() || !currentActiveChatRoom) return;

    const textVal = inputElem.value.trim();
    const nowTime = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
        sender: currentUser.name,
        avatar: currentUser.avatar,
        text: textVal,
        time: nowTime,
        isMe: true
    };

    currentActiveChatRoom.messages.push(newMsg);
    currentActiveChatRoom.lastMessage = `${currentUser.name.split(' ')[0]}: ${textVal}`;
    currentActiveChatRoom.lastTime = nowTime;

    inputElem.value = "";
    renderChatMessages();

    if (currentActiveChatRoom.type === "group") {
        setTimeout(() => {
            const guideReply = {
                sender: "Tour Guide Herman",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
                text: "Siap, pesan diterima! Tim kami akan terus memperbarui informasi persiapannya ya.",
                time: new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
                isMe: false
            };
            currentActiveChatRoom.messages.push(guideReply);
            renderChatMessages();
        }, 1200);
    }
}

function startPaymentTimer(hours, minutes, seconds) {
    let totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const timerText = document.getElementById("countdown-timer");
    if (!timerText) return;

    const timerInterval = setInterval(() => {
        if (totalSeconds <= 0) {
            clearInterval(timerInterval);
            timerText.innerText = "EXPIRED";
            return;
        }
        totalSeconds--;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const pad = (num) => String(num).padStart(2, '0');
        timerText.innerText = `${pad(h)}:${pad(m)}:${pad(s)}`;
    }, 1000);
}

function formatIDRCurrency(priceNumber) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(priceNumber).replace("IDR", "Rp");
}

function toggleWishlist(button) {
    button.classList.toggle("active");
    const icon = button.querySelector("i");
    if (button.classList.contains("active")) {
        icon.className = "fa-solid fa-heart";
        alert("Trip Berhasil Ditambahkan ke Wishlist!");
    } else {
        icon.className = "fa-regular fa-heart";
    }
}

// 22. Live Package Sync from Backend (Provider Web Sync)
async function fetchPackagesFromBackend() {
    try {
        const response = await fetch("http://localhost:8080/api/v1/public/packages");
        if (response.ok) {
            const apiPackages = await response.json();
            if (Array.isArray(apiPackages) && apiPackages.length > 0) {
                // Filter ONLY active packages from backend (exclude draft & deleted)
                const activePackages = apiPackages.filter(p => p.status === 'Aktif');
                
                activePackages.forEach(apiPkg => {
                    const existingIdx = packagesDB.findIndex(p => p.id === apiPkg.id);
                    const formattedPkg = {
                        id: apiPkg.id,
                        name: apiPkg.name,
                        destination: apiPkg.destination || "DKI Jakarta",
                        province: apiPkg.destination || "DKI Jakarta",
                        price: apiPkg.price || 1500000,
                        quotaMin: apiPkg.quotaMin || 1,
                        quotaUsed: apiPkg.quotaUsed || 0,
                        quotaMax: apiPkg.quotaMax || 15,
                        schedule: apiPkg.schedule ? [apiPkg.schedule] : ["Flexible"],
                        status: apiPkg.status || "Aktif",
                        rating: apiPkg.rating || 4.9,
                        reviewCount: 48,
                        duration: "3 Hari 2 Malam",
                        tripType: apiPkg.tripType || "Open Trip",
                        category: apiPkg.category || "City Tour",
                        minParticipants: apiPkg.quotaMin || 1,
                        availableSeats: (apiPkg.quotaMax || 15) - (apiPkg.quotaUsed || 0),
                        providerName: "Wisata Nusantara",
                        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
                        description: apiPkg.description || "Wisata Nusantara menghadirkan pengalaman tour berkualitas tinggi dengan fasilitas lengkap.",
                        images: [
                            "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=600",
                            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"
                        ],
                        itinerary: ["Hari 1: Penjemputan", "Hari 2: Tour & Kegiatan", "Hari 3: Transfer Out"],
                        facilities: ["Transport AC", "Makan sesuai program", "Pemandu Profesional"],
                        includes: ["Tiket Masuk Wisata", "Asuransi Perjalanan"],
                        excludes: ["Tiket Pesawat", "Pengeluaran Pribadi"],
                        meetingPoint: "Meeting Point Wisata Nusantara"
                    };

                    if (existingIdx !== -1) {
                        packagesDB[existingIdx] = formattedPkg;
                    } else {
                        packagesDB.unshift(formattedPkg);
                    }
                });

                if (typeof renderHomeScreenData === 'function') renderHomeScreenData();
                if (typeof renderTripListData === 'function') renderTripListData();
            }
        }
    } catch (err) {
        console.log("Backend sync notice: Offline or CORS fallback active.", err);
    }
}

// 23. 5-Field Interactive Search Handler
document.addEventListener("DOMContentLoaded", () => {
    fetchPackagesFromBackend();

    const dateInput = document.getElementById("input-home-date");
    if (dateInput) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        dateInput.setAttribute("min", todayStr);
        
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const formattedToday = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
        dateInput.value = formattedToday;
    }

    const searchBtn = document.getElementById("btn-search-trips");
    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
            const destVal = document.getElementById("select-home-dest")?.value || "";
            const dateVal = document.getElementById("input-home-date")?.value || "";
            const guestsVal = parseInt(document.getElementById("input-home-guests")?.value, 10) || 1;
            const typeVal = document.getElementById("select-home-type")?.value || "";
            const categoryVal = document.getElementById("select-home-category")?.value || "";

            // Filter packages matching criteria & ONLY active status
            const filteredTrips = packagesDB.filter(p => {
                if (p.status !== "Aktif") return false;
                if (destVal && !p.destination.toLowerCase().includes(destVal.toLowerCase()) && !p.province.toLowerCase().includes(destVal.toLowerCase())) return false;
                if (typeVal && p.tripType.toLowerCase() !== typeVal.toLowerCase()) return false;
                if (categoryVal && p.category.toLowerCase() !== categoryVal.toLowerCase()) return false;
                return true;
            });

            // Navigate to Trip List screen and show filtered results
            if (typeof switchScreen === 'function') {
                switchScreen("screen-list");
            }

            const listContainer = document.getElementById("trips-list-container");
            if (listContainer) {
                if (filteredTrips.length === 0) {
                    listContainer.innerHTML = `
                        <div class="empty-state-box" style="text-align:center; padding: 32px 16px;">
                            <i class="fa-solid fa-compass" style="font-size:40px; color:#d1d5db; margin-bottom:12px;"></i>
                            <h4 style="margin:0; font-size:14px; color:#374151;">Trip Tidak Ditemukan</h4>
                            <p style="margin:4px 0 0 0; font-size:11px; color:#6b7280;">Coba sesuaikan filter pencarian (Destinasi, Tanggal, Tipe, atau Kategori).</p>
                        </div>
                    `;
                } else if (typeof renderFilteredTrips === 'function') {
                    renderFilteredTrips(filteredTrips);
                }
            }
        });
    }
});

// 24. Direct Chat Provider Navigation per Selected Package
function openChatForCurrentPackage() {
    if (currentActivePackage) {
        openChatForPackageID(currentActivePackage.id);
    }
}

function openChatForPackageID(pkgId) {
    const pkg = packagesDB.find(p => p.id === pkgId) || currentActivePackage;
    let room = chatRoomsDB.find(r => r.packageId === pkg.id && r.type === "direct");
    
    if (!room) {
        room = {
            id: `direct-provider-${pkg.id}-${Date.now()}`,
            type: "direct",
            title: `💬 ${pkg.providerName || 'Wisata Nusantara'} (${pkg.name})`,
            subTitle: `Tanya jawab seputar ${pkg.name}`,
            image: pkg.images[0] || pkg.providerAvatar,
            packageId: pkg.id,
            unreadCount: 0,
            lastMessage: `Anda: Halo! Saya berminat dengan paket ${pkg.name}.`,
            lastTime: "Baru saja",
            isUnlocked: true,
            members: [],
            messages: [
                { sender: pkg.providerName || "Wisata Nusantara", avatar: pkg.providerAvatar, text: `Halo! Terima kasih telah tertarik dengan paket trip ${pkg.name}. Ada yang bisa kami bantu?`, time: "Baru saja", isMe: false },
                { sender: currentUser.name, avatar: currentUser.avatar, text: `Halo! Saya mau tanya ketersediaan kuota dan fasilitas paket ${pkg.name}.`, time: "Baru saja", isMe: true }
            ]
        };
        chatRoomsDB.unshift(room);
    }

    switchScreen("screen-chat");
    openChatRoom(room.id);
}

function generateQRISCode() {
    // 1. Render on qris-canvas (180x180)
    const qrisCanvas = document.getElementById("qris-canvas");
    if (qrisCanvas) {
        const ctx = qrisCanvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 180, 180);
            ctx.fillStyle = "#000000";
            
            // Draw positioning blocks (top-left, top-right, bottom-left)
            // Top-left
            ctx.fillRect(10, 10, 40, 40);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(15, 15, 30, 30);
            ctx.fillStyle = "#000000";
            ctx.fillRect(20, 20, 20, 20);
            
            // Top-right
            ctx.fillRect(130, 10, 40, 40);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(135, 15, 30, 30);
            ctx.fillStyle = "#000000";
            ctx.fillRect(140, 20, 20, 20);
            
            // Bottom-left
            ctx.fillRect(10, 130, 40, 40);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(15, 135, 30, 30);
            ctx.fillStyle = "#000000";
            ctx.fillRect(20, 140, 20, 20);
            
            // Draw some random qr noise
            ctx.fillStyle = "#000000";
            for (let i = 0; i < 20; i++) {
                for (let j = 0; j < 20; j++) {
                    if (Math.random() > 0.6) {
                        ctx.fillRect(50 + i * 4, 10 + j * 8, 4, 4);
                    }
                }
            }
        }
    }

    // 2. Render on detail-ticket-qr (80x80)
    const ticketCanvas = document.getElementById("detail-ticket-qr");
    if (ticketCanvas) {
        const ctx = ticketCanvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 80, 80);
            ctx.fillStyle = "#000000";
            
            // Top-left block
            ctx.fillRect(5, 5, 20, 20);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(8, 8, 14, 14);
            ctx.fillStyle = "#000000";
            ctx.fillRect(11, 11, 8, 8);
            
            // Top-right block
            ctx.fillRect(55, 5, 20, 20);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(58, 8, 14, 14);
            ctx.fillStyle = "#000000";
            ctx.fillRect(61, 11, 8, 8);
            
            // Bottom-left block
            ctx.fillRect(5, 55, 20, 20);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(8, 58, 14, 14);
            ctx.fillStyle = "#000000";
            ctx.fillRect(11, 61, 8, 8);
            
            // Random noise
            ctx.fillStyle = "#000000";
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    if (Math.random() > 0.6) {
                        ctx.fillRect(25 + i * 3, 5 + j * 5, 3, 3);
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------
// 19. Rencana Trip & Target Tabungan (Plan Screen Prototype State & Renderer)
// -------------------------------------------------------------
let selectedPlanId = null;
let currentPlanIdForModal = null;
let planToEditIdModal = null;

let tripPlansDB = [
    {
        id: "plan_palu_1",
        destination: "Palu",
        targetMonth: "2027-03",
        targetMonthLabel: "17 Maret 2027",
        participants: 2,
        targetBudget: 10000000,
        savedAmount: 1000000,
        status: "Tersimpan",
        checklist: [
            { id: "1", label: "Tentukan Destinasi & Target Budget Liburan", completed: true, isAutomatic: true },
            { id: "2", label: "Capai 25% Tabungan Perjalanan", completed: false, isAutomatic: true },
            { id: "3", label: "Capai 50% Tabungan Perjalanan", completed: false, isAutomatic: true },
            { id: "4", label: "Capai 75% Tabungan Perjalanan", completed: false, isAutomatic: true },
            { id: "5", label: "Capai 100% Target Tabungan", completed: false, isAutomatic: true },
            { id: "6", label: "Cari & Pesan Paket Open Trip di TemenTrip", completed: false, isAutomatic: false }
        ],
        savingsLogs: [
            { id: "log_1", date: "17 Sep 2026", amount: 1000000, note: "Tabungan bulanan" }
        ]
    }
];

function generateAvailableFutureMonths() {
    const months = [];
    const now = new Date();
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const val = `${yyyy}-${mm}`;
        const label = `${monthNames[d.getMonth()]} ${yyyy}`;
        months.push({ val, label });
    }
    return months;
}

function updatePlanMilestones(plan) {
    const pct = plan.targetBudget > 0 ? Math.min(100, Math.round((plan.savedAmount / plan.targetBudget) * 100)) : 0;
    plan.checklist.forEach(item => {
        if (item.id === "2") item.completed = pct >= 25;
        if (item.id === "3") item.completed = pct >= 50;
        if (item.id === "4") item.completed = pct >= 75;
        if (item.id === "5") item.completed = pct >= 100;
    });
}

function renderTripPlanScreen() {
    const container = document.getElementById("plan-screen-container");
    if (!container) return;

    if (selectedPlanId) {
        const plan = tripPlansDB.find(p => p.id === selectedPlanId);
        if (plan) {
            renderPlanDetailView(container, plan);
            return;
        } else {
            selectedPlanId = null;
        }
    }

    renderPlanListView(container);
}

function renderPlanListView(container) {
    const planCount = tripPlansDB.length;
    
    let html = `
        <!-- Hero Banner -->
        <div style="background: linear-gradient(135deg, #0f8b8d 0%, #09686a 100%); border-radius: 18px; padding: 16px; color: white; margin-bottom: 16px; box-shadow: 0 4px 14px rgba(15,139,141,0.25);">
            <span style="background: #f59e0b; color: white; font-size: 9px; font-weight: 900; padding: 3px 8px; border-radius: 12px; letter-spacing: 0.5px; text-transform: uppercase;">LIBURAN IMPIAN TANPA BEBAN</span>
            <h4 style="margin: 8px 0 4px 0; font-size: 14px; font-weight: bold; line-height: 1.3;">Rencanakan Liburan Seru Bersama Pasangan, Teman, atau Keluarga! 🏝️✨</h4>
            <p style="margin: 0; font-size: 11px; opacity: 0.9; line-height: 1.4;">Susun target budget dan tabungan bulananmu mulai dari sekarang. Nikmati perjalanan impian tanpa perlu risau masalah keuangan!</p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <strong style="font-size: 14px; color: #0f172a;">Daftar Rencana Trip Saya (${planCount}/10)</strong>
        </div>
    `;

    if (planCount === 0) {
        html += `
            <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px 16px; text-align: center; color: #64748b;">
                <i class="fa-solid fa-compass" style="font-size: 36px; color: #cbd5e1; margin-bottom: 8px;"></i>
                <h5 style="margin: 0 0 4px 0; font-size: 14px; color: #0f172a;">Belum Ada Rencana Trip</h5>
                <p style="margin: 0; font-size: 11px;">Yuk susun target tabungan liburan impianmu sekarang!</p>
            </div>
        `;
    } else {
        tripPlansDB.forEach(plan => {
            updatePlanMilestones(plan);
            const savedPercentage = plan.targetBudget > 0 ? Math.min(100, Math.round((plan.savedAmount / plan.targetBudget) * 100)) : 0;
            const remainingBudget = Math.max(0, plan.targetBudget - plan.savedAmount);

            html += `
                <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 14px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="background: #dcfce7; color: #166534; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 8px;">${plan.status}</span>
                        <span style="background: #e6f4f4; color: #0f8b8d; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 8px;">${savedPercentage}% Terkumpul</span>
                    </div>

                    <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: #0f172a;">🏝️ ${plan.destination}</h4>
                    <div style="font-size: 11px; color: #64748b; margin-bottom: 12px; display: flex; gap: 12px;">
                        <span><i class="fa-regular fa-calendar-days" style="color:#0f8b8d;"></i> ${plan.targetMonthLabel}</span>
                        <span><i class="fa-solid fa-users" style="color:#0f8b8d;"></i> ${plan.participants} Peserta</span>
                    </div>

                    <div style="background: #f8fafc; border-radius: 12px; padding: 10px; border: 1px solid #f1f5f9; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700; color: #64748b; margin-bottom: 2px;">
                            <span>TERKUMPUL</span>
                            <span>TARGET BUDGET</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 800; margin-bottom: 6px;">
                            <span style="color: #10b981;">${formatIDRCurrency(plan.savedAmount)}</span>
                            <span style="color: #0f172a;">${formatIDRCurrency(plan.targetBudget)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                            <span>Sisa Dibutuhkan:</span>
                            <strong style="color: ${remainingBudget > 0 ? '#ef4444' : '#10b981'};">${formatIDRCurrency(remainingBudget)}</strong>
                        </div>
                    </div>

                    <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
                        <div style="height: 100%; width: ${savedPercentage}%; background: ${savedPercentage >= 100 ? '#10b981' : '#0f8b8d'}; border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>

                    <div style="display: flex; gap: 6px;">
                        <button onclick="selectTripPlan('${plan.id}')" style="flex: 1; background: #0f8b8d; color: white; border: none; border-radius: 10px; padding: 8px; font-size: 12px; font-weight: bold; cursor: pointer; boxShadow: 0 2px 6px rgba(15,139,141,0.2);">Lihat Detail →</button>
                        <button onclick="openCreatePlanModal('${plan.id}')" style="background: white; border: 1px solid #cbd5e1; color: #475569; border-radius: 10px; width: 34px; height: 34px; cursor: pointer;"><i class="fa-regular fa-pen-to-square"></i></button>
                        <button onclick="deleteTripPlan('${plan.id}')" style="background: #fef2f2; border: 1px solid #fca5a5; color: #ef4444; border-radius: 10px; width: 34px; height: 34px; cursor: pointer;"><i class="fa-regular fa-trash-can"></i></button>
                    </div>
                </div>
            `;
        });
    }

    html += `
        <button onclick="openCreatePlanModal()" style="width: 100%; background: #0f8b8d; color: white; border: none; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(15,139,141,0.25);">
            <i class="fa-solid fa-plus"></i> Buat Rencana Baru (${planCount}/10)
        </button>
    `;

    container.innerHTML = html;
}

function selectTripPlan(planId) {
    selectedPlanId = planId;
    renderTripPlanScreen();
}

function deleteTripPlan(planId) {
    if (confirm("Apakah Anda yakin ingin menghapus Rencana Trip ini?")) {
        tripPlansDB = tripPlansDB.filter(p => p.id !== planId);
        if (selectedPlanId === planId) selectedPlanId = null;
        renderTripPlanScreen();
    }
}

function renderPlanDetailView(container, plan) {
    updatePlanMilestones(plan);
    const savedPercentage = plan.targetBudget > 0 ? Math.min(100, Math.round((plan.savedAmount / plan.targetBudget) * 100)) : 0;
    const remainingBudget = Math.max(0, plan.targetBudget - plan.savedAmount);
    const is100 = savedPercentage >= 100;

    // Package Matching with Image Fallbacks
    const destLower = plan.destination.toLowerCase();
    let matchingPkgs = packagesDB.filter(pkg =>
        pkg.destination.toLowerCase().includes(destLower) ||
        pkg.name.toLowerCase().includes(destLower)
    );
    if (matchingPkgs.length === 0) {
        matchingPkgs = packagesDB.slice(0, 3);
    }

    let html = `
        <div onclick="selectTripPlan(null)" style="color: #0f8b8d; font-size: 12px; font-weight: 800; margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-arrow-left"></i> Kembali ke Daftar Rencana Trip Saya
        </div>

        <!-- Plan Header Box -->
        <div style="background: white; border-radius: 18px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
            <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                <span style="background: #e6f4f4; color: #0f8b8d; font-size: 9.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px;">TARGET LIBURAN</span>
                <span style="background: #dcfce7; color: #166534; font-size: 9.5px; font-weight: 800; padding: 3px 8px; border-radius: 6px;">Status: ${plan.status}</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 900; color: #0f172a;">${plan.destination}</h3>
                    <div style="font-size: 11.5px; color: #64748b; display: flex; gap: 12px; font-weight: 600;">
                        <span><i class="fa-regular fa-calendar-days" style="color:#0f8b8d;"></i> ${plan.targetMonthLabel}</span>
                        <span><i class="fa-solid fa-users" style="color:#0f8b8d;"></i> ${plan.participants} Peserta</span>
                    </div>
                </div>
                <button onclick="openSavingsModal('${plan.id}')" style="background: #0f8b8d; color: white; border: none; border-radius: 12px; padding: 8px 12px; font-size: 11.5px; font-weight: 800; cursor: pointer; box-shadow: 0 3px 8px rgba(15,139,141,0.25);">
                    + Catat Tabungan
                </button>
            </div>

            <!-- Progress Box -->
            <div style="background: #f8fafc; border-radius: 14px; padding: 12px; border: 1px solid #f1f5f9;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 12px; font-weight: 800; color: #334155;">📈 Progres Tabungan</span>
                    <strong style="font-size: 15px; font-weight: 900; color: #0f8b8d;">${savedPercentage}%</strong>
                </div>
                <div style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin-bottom: 10px;">
                    <div style="height: 100%; width: ${savedPercentage}%; background: ${is100 ? '#10b981' : '#0f8b8d'}; border-radius: 5px; transition: width 0.3s ease;"></div>
                </div>

                <div style="display: flex; gap: 6px; text-align: center;">
                    <div style="flex: 1; background: white; border-radius: 10px; border: 1px solid #e2e8f0; padding: 8px 4px;">
                        <span style="font-size: 8px; font-weight: 700; color: #64748b; display: block; text-transform: uppercase;">TERKUMPUL</span>
                        <strong style="font-size: 11.5px; font-weight: 800; color: #10b981;">${formatIDRCurrency(plan.savedAmount)}</strong>
                    </div>
                    <div style="flex: 1; background: white; border-radius: 10px; border: 1px solid #e2e8f0; padding: 8px 4px;">
                        <span style="font-size: 8px; font-weight: 700; color: #64748b; display: block; text-transform: uppercase;">TARGET TOTAL</span>
                        <strong style="font-size: 11.5px; font-weight: 800; color: #0f172a;">${formatIDRCurrency(plan.targetBudget)}</strong>
                    </div>
                    <div style="flex: 1; background: white; border-radius: 10px; border: 1px solid #e2e8f0; padding: 8px 4px;">
                        <span style="font-size: 8px; font-weight: 700; color: #64748b; display: block; text-transform: uppercase;">SISA DIBUTUHKAN</span>
                        <strong style="font-size: 11.5px; font-weight: 800; color: ${remainingBudget > 0 ? '#ef4444' : '#10b981'};">${formatIDRCurrency(remainingBudget)}</strong>
                    </div>
                </div>
            </div>
        </div>

        <!-- Motivation Alert Box -->
        <div style="background: ${is100 ? '#ecfdf5' : '#e6f4f4'}; border: 1.5px solid ${is100 ? '#a7f3d0' : '#b2e2e2'}; border-radius: 16px; padding: 14px; margin-bottom: 14px; display: flex; gap: 12px; align-items: flex-start;">
            <div style="font-size: 26px;">${is100 ? '🥳' : '🚀'}</div>
            <div style="flex: 1;">
                <h5 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; color: ${is100 ? '#065f46' : '#0d5c5e'};">
                    ${is100 ? 'SELAMAT! Target Tabungan 100% Terkumpul!' : 'Langkah Awal Memulai Perjalanan Impian! 🚀'}
                </h5>
                <p style="margin: 0; font-size: 11.5px; color: ${is100 ? '#047857' : '#0f8b8d'}; line-height: 1.4;">
                    ${is100
                        ? `Tabungan liburan kamu ke ${plan.destination} sudah terkumpul penuh (${formatIDRCurrency(plan.savedAmount)}). Yuk langsung cari dan pesan paket trip di bawah!`
                        : `Setiap perjalanan besar dimulai dari langkah kecil. Rencana trip impianmu ke ${plan.destination} baru saja dimulai. Yuk konsisten sisihkan tabungan bulan ini! ✨`}
                </p>
                ${is100 ? `
                    <button onclick="switchScreen('screen-list')" style="margin-top: 8px; background: #10b981; color: white; border: none; border-radius: 8px; padding: 6px 12px; font-size: 11px; font-weight: 800; cursor: pointer;">
                        Pesan Trip Sekarang →
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- Checklist Section -->
        <div style="background: white; border-radius: 18px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
            <h5 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-wand-magic-sparkles" style="color:#0f8b8d;"></i> Checklist Persiapan Trip
            </h5>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                ${plan.checklist.map((item, idx) => `
                    <div style="display: flex; align-items: center; gap: 10px; background: ${item.completed ? '#f0fdf4' : '#f8fafc'}; border: 1px solid ${item.completed ? '#bbf7d0' : '#e2e8f0'}; padding: 10px 12px; border-radius: 12px; transition: all 0.2s ease;">
                        <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleChecklistItem('${plan.id}', '${item.id}')" style="width: 16px; height: 16px; accent-color: #10b981; cursor: pointer;">
                        <span style="flex: 1; font-size: 12px; font-weight: ${item.completed ? '800' : '600'}; color: ${item.completed ? '#166534' : '#334155'}; text-decoration: ${item.completed ? 'line-through' : 'none'};">
                            ${item.label}
                        </span>
                        ${item.isAutomatic ? `
                            <span style="font-size: 8.5px; background: #e0f2fe; color: #0369a1; padding: 3px 6px; border-radius: 6px; font-weight: 800;">Otomatis</span>
                        ` : `
                            <i class="fa-regular fa-trash-can" onclick="deleteChecklistItem('${plan.id}', ${idx})" style="color: #94a3b8; font-size: 14px; cursor: pointer;"></i>
                        `}
                    </div>
                `).join('')}
            </div>

            <div style="display: flex; gap: 8px;">
                <input type="text" id="input-custom-checklist" placeholder="Tambah item checklist baru..." style="flex: 1; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 12px; outline: none;">
                <button onclick="addCustomChecklistItem('${plan.id}')" style="background: #0f8b8d; color: white; border: none; border-radius: 10px; padding: 10px 16px; font-size: 12px; font-weight: 800; cursor: pointer;">Tambah</button>
            </div>
        </div>

        <!-- Savings Logs Section -->
        <div style="background: white; border-radius: 18px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
            <h5 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-wallet" style="color:#0f8b8d;"></i> Riwayat Catatan Tabungan
            </h5>

            ${plan.savingsLogs.length === 0 ? `
                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 16px 0; line-height: 1.4;">Belum ada tabungan yang dicatat.<br>Klik tombol <strong>"+ Catat Tabungan"</strong> di atas.</p>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${plan.savingsLogs.map((log, lIdx) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #f1f5f9; padding: 10px 12px; border-radius: 12px;">
                            <div>
                                <div style="font-size: 10.5px; color: #64748b; font-weight: 600;">${log.date}</div>
                                <div style="font-size: 12px; font-weight: 700; color: #334155;">${log.note}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <strong style="font-size: 13px; font-weight: 800; color: #10b981;">+ ${formatIDRCurrency(log.amount)}</strong>
                                <i class="fa-regular fa-trash-can" onclick="deleteSavingsLog('${plan.id}', ${lIdx})" style="color: #94a3b8; font-size: 13px; cursor: pointer;"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>

        <!-- Rekomendasi Open Trip Cards -->
        <div style="margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="font-size: 13px; font-weight: 800; color: #0f172a;">Rekomendasi Open Trip ke ${plan.destination}</strong>
                <span onclick="switchScreen('screen-list')" style="font-size: 11px; color: #0f8b8d; font-weight: 800; cursor: pointer;">Lihat Semua ></span>
            </div>
            <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px;">
                ${matchingPkgs.slice(0, 3).map(pkg => {
                    const pkgImg = (pkg.images && pkg.images.length > 0) ? pkg.images[0] : (pkg.image || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600');
                    return `
                        <div onclick="openPackageDetail(${pkg.id})" style="min-width: 170px; width: 170px; background: white; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
                            <div style="height: 90px; width: 100%; position: relative;">
                                <img src="${pkgImg}" style="width: 100%; height: 100%; object-fit: cover;" onError="this.src='https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600'">
                                <span style="position: absolute; top: 6px; left: 6px; background: #0f8b8d; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${pkg.tripType || 'Open Trip'}</span>
                            </div>
                            <div style="padding: 10px;">
                                <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; margin-bottom: 2px;">${pkg.name}</div>
                                <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">${pkg.destination}</div>
                                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 6px;">
                                    <span style="font-size: 10px; color: #d97706; font-weight: 800;">⭐ ${pkg.rating || 4.9}</span>
                                    <strong style="font-size: 11.5px; color: #0f8b8d; font-weight: 800;">${formatIDRCurrency(pkg.price)}</strong>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Bottom Actions -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button onclick="deleteTripPlan('${plan.id}')" style="flex: 1; background: white; border: 1.5px solid #ef4444; color: #ef4444; border-radius: 12px; padding: 12px; font-size: 12.5px; font-weight: 800; cursor: pointer;">Batalkan Rencana</button>
            <button onclick="selectTripPlan(null)" style="flex: 1; background: #0f8b8d; color: white; border: none; border-radius: 12px; padding: 12px; font-size: 12.5px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(15,139,141,0.25);">Simpan Rencana</button>
        </div>
    `;

    container.innerHTML = html;
}

function toggleChecklistItem(planId, itemId) {
    const plan = tripPlansDB.find(p => p.id === planId);
    if (plan) {
        const item = plan.checklist.find(i => i.id === itemId);
        if (item) {
            item.completed = !item.completed;
            renderTripPlanScreen();
        }
    }
}

function addCustomChecklistItem(planId) {
    const input = document.getElementById("input-custom-checklist");
    if (!input || !input.value.trim()) return;
    const plan = tripPlansDB.find(p => p.id === planId);
    if (plan) {
        plan.checklist.push({
            id: `chk_${Date.now()}`,
            label: input.value.trim(),
            completed: false,
            isAutomatic: false
        });
        renderTripPlanScreen();
    }
}

function deleteChecklistItem(planId, idx) {
    const plan = tripPlansDB.find(p => p.id === planId);
    if (plan) {
        plan.checklist.splice(idx, 1);
        renderTripPlanScreen();
    }
}

function deleteSavingsLog(planId, lIdx) {
    const plan = tripPlansDB.find(p => p.id === planId);
    if (plan && plan.savingsLogs[lIdx]) {
        plan.savedAmount -= plan.savingsLogs[lIdx].amount;
        if (plan.savedAmount < 0) plan.savedAmount = 0;
        plan.savingsLogs.splice(lIdx, 1);
        updatePlanMilestones(plan);
        renderTripPlanScreen();
    }
}

function openSavingsModal(planId) {
    currentPlanIdForModal = planId;
    const amountInput = document.getElementById("savings-amount-input");
    const noteInput = document.getElementById("savings-note-input");
    if (amountInput) amountInput.value = "";
    if (noteInput) noteInput.value = "Tabungan bulanan";
    
    const modal = document.getElementById("modal-add-savings");
    if (modal) modal.style.display = "flex";
}

function closeSavingsModal() {
    const modal = document.getElementById("modal-add-savings");
    if (modal) modal.style.display = "none";
}

function submitSavingsForm() {
    const amountInput = document.getElementById("savings-amount-input");
    const noteInput = document.getElementById("savings-note-input");
    if (!amountInput) return;

    const raw = amountInput.value.replace(/\D/g, '');
    const amount = parseInt(raw, 10);
    if (isNaN(amount) || amount <= 0) {
        alert("Masukkan nominal tabungan yang valid.");
        return;
    }

    const note = (noteInput && noteInput.value.trim()) ? noteInput.value.trim() : "Tabungan bulanan";
    const plan = tripPlansDB.find(p => p.id === currentPlanIdForModal);
    if (plan) {
        plan.savedAmount += amount;
        plan.savingsLogs.unshift({
            id: `log_${Date.now()}`,
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            amount: amount,
            note: note
        });
        updatePlanMilestones(plan);
        renderTripPlanScreen();
    }
    closeSavingsModal();
}

function openCreatePlanModal(planIdToEdit = null) {
    planToEditIdModal = planIdToEdit;
    const titleEl = document.getElementById("plan-modal-title");
    const destInput = document.getElementById("plan-dest-input");
    const monthSelect = document.getElementById("plan-month-select");
    const partInput = document.getElementById("plan-participants-input");
    const budgetInput = document.getElementById("plan-budget-input");

    // Populate month select
    if (monthSelect) {
        monthSelect.innerHTML = "";
        const months = generateAvailableFutureMonths();
        months.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.val;
            opt.textContent = m.label;
            monthSelect.appendChild(opt);
        });
    }

    if (planIdToEdit) {
        const plan = tripPlansDB.find(p => p.id === planIdToEdit);
        if (plan) {
            if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-teal" style="color: #0f8b8d;"></i> Edit Rencana Trip`;
            if (destInput) destInput.value = plan.destination;
            if (monthSelect) monthSelect.value = plan.targetMonth;
            if (partInput) partInput.value = plan.participants;
            if (budgetInput) budgetInput.value = formatIDRCurrency(plan.targetBudget).replace("Rp ", "");
        }
    } else {
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-compass text-teal" style="color: #0f8b8d;"></i> Buat Rencana Trip Baru`;
        if (destInput) destInput.value = "";
        if (partInput) partInput.value = "2";
        if (budgetInput) budgetInput.value = "";
    }

    const modal = document.getElementById("modal-create-plan");
    if (modal) modal.style.display = "flex";
}

function closePlanFormModal() {
    const modal = document.getElementById("modal-create-plan");
    if (modal) modal.style.display = "none";
}

function submitPlanForm() {
    const destInput = document.getElementById("plan-dest-input");
    const monthSelect = document.getElementById("plan-month-select");
    const partInput = document.getElementById("plan-participants-input");
    const budgetInput = document.getElementById("plan-budget-input");

    const dest = destInput ? destInput.value.trim() : "";
    const rawBudget = budgetInput ? budgetInput.value.replace(/\D/g, '') : "";
    const budget = parseInt(rawBudget, 10);
    const participants = parseInt(partInput ? partInput.value : "2", 10) || 1;
    const targetMonth = monthSelect ? monthSelect.value : "";
    const monthLabel = monthSelect && monthSelect.options[monthSelect.selectedIndex] ? monthSelect.options[monthSelect.selectedIndex].text : targetMonth;

    if (!dest || isNaN(budget) || budget <= 0) {
        alert("Silakan lengkapi destinasi impian dan target budget yang valid.");
        return;
    }

    if (planToEditIdModal) {
        const plan = tripPlansDB.find(p => p.id === planToEditIdModal);
        if (plan) {
            plan.destination = dest;
            plan.targetMonth = targetMonth;
            plan.targetMonthLabel = monthLabel;
            plan.participants = participants;
            plan.targetBudget = budget;
            updatePlanMilestones(plan);
        }
    } else {
        const newPlan = {
            id: `plan_${Date.now()}`,
            destination: dest,
            targetMonth: targetMonth,
            targetMonthLabel: monthLabel,
            participants: participants,
            targetBudget: budget,
            savedAmount: 0,
            status: "Tersimpan",
            checklist: [
                { id: "1", label: "Tentukan Destinasi & Target Budget Liburan", completed: true, isAutomatic: true },
                { id: "2", label: "Capai 25% Tabungan Perjalanan", completed: false, isAutomatic: true },
                { id: "3", label: "Capai 50% Tabungan Perjalanan", completed: false, isAutomatic: true },
                { id: "4", label: "Capai 75% Tabungan Perjalanan", completed: false, isAutomatic: true },
                { id: "5", label: "Capai 100% Target Tabungan", completed: false, isAutomatic: true },
                { id: "6", label: "Cari & Pesan Paket Open Trip di TemenTrip", completed: false, isAutomatic: false }
            ],
            savingsLogs: []
        };
        tripPlansDB.unshift(newPlan);
        selectedPlanId = newPlan.id;
    }

    renderTripPlanScreen();
    closePlanFormModal();
}

// Immediate Top-Level Execution (Script at bottom of <body>)
try {
    renderHomeScreenData();
    renderTripListData();
} catch (e) {
    console.error("Auto-render error:", e);
}

document.addEventListener("DOMContentLoaded", () => {
    try { renderHomeScreenData(); renderTripListData(); renderTripPlanScreen(); } catch (e) {}
});
window.addEventListener("load", () => {
    try { renderHomeScreenData(); renderTripListData(); renderTripPlanScreen(); } catch (e) {}
});
