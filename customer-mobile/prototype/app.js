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

// 3. Mock Database Packages (Synced with Provider "Wisata Nusantara")
const packagesDB = [
    {
        id: 1,
        name: "Open Trip Raja Ampat Diving & Snorkeling",
        destination: "Papua Barat",
        province: "Papua Barat",
        price: 4200000,
        quotaMin: 4,
        quotaUsed: 8,
        quotaMax: 12,
        schedule: ["01 Agu", "02 Agu", "03 Agu", "04 Agu", "05 Agu"],
        status: "Aktif",
        rating: 4.97,
        reviewCount: 120,
        duration: "5 Hari 4 Malam",
        tripType: "Open Trip",
        category: "Diving & Snorkeling",
        minParticipants: 4,
        availableSeats: 4,
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Wisata Nusantara menghadirkan petualangan diving & snorkeling terbaik di surga karst Raja Ampat.",
        images: [
            "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=600",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"
        ],
        itinerary: [
            "Hari 1: Penjemputan di Bandara Sorong - Waisai - Check-in Resort",
            "Hari 2: Snorkeling di Pulau Wayag - Trekking Puncak Wayag - Lunch di Pantai",
            "Hari 3: Island Hopping Pianemo Viewpoint - Snorkeling Manta Point",
            "Hari 4: Morning walk di Resort - Transfer Sorong"
        ],
        facilities: ["Resort AC", "Speedboat Premium", "Makan 3x Sehari", "Alat Snorkeling", "GoPro Documentation"],
        includes: ["Pianemo Entry Fee", "Raja Ampat Pin Kartu", "Asuransi Perjalanan"],
        excludes: ["Tiket Pesawat ke Sorong", "Pengeluaran Pribadi"],
        meetingPoint: "Bandara Domine Eduard Osok, Sorong"
    },
    {
        id: 2,
        name: "Private Trip Bali Cultural & Heritage Tour",
        destination: "Bali",
        province: "Bali",
        price: 1550000,
        quotaMin: 2,
        quotaUsed: 18,
        quotaMax: 20,
        schedule: ["10 Agu", "11 Agu", "12 Agu"],
        status: "Aktif",
        rating: 4.91,
        reviewCount: 85,
        duration: "3 Hari 2 Malam",
        tripType: "Private Trip",
        category: "Wisata Budaya & Sejarah",
        minParticipants: 2,
        availableSeats: 2,
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Jelajahi kekayaan budaya dan keindahan pura di Bali bersama pemandu profesional Wisata Nusantara.",
        images: [
            "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600"
        ],
        itinerary: ["Hari 1: Arrival - Check-in Villa", "Hari 2: Ubud Cultural Tour & Tirta Empul", "Hari 3: Souvenir & Departure"],
        facilities: ["Mobil AC Private", "Hotel Bintang 4", "Makan Siang & Malam"],
        includes: ["Tiket Masuk Wisata", "Air Mineral"],
        excludes: ["Tiket Pesawat"],
        meetingPoint: "Bandara I Gusti Ngurah Rai, Bali"
    },
    {
        id: 3,
        name: "Open Trip Komodo Island Beach & Snorkeling",
        destination: "Nusa Tenggara Timur (NTT)",
        province: "Nusa Tenggara Timur (NTT)",
        price: 3900000,
        quotaMin: 4,
        quotaUsed: 7,
        quotaMax: 10,
        schedule: ["15 Agu", "16 Agu", "17 Agu", "18 Agu"],
        status: "Aktif",
        rating: 4.95,
        reviewCount: 94,
        duration: "4 Hari 3 Malam",
        tripType: "Open Trip",
        category: "Pantai",
        minParticipants: 4,
        availableSeats: 3,
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Saksikan habitat Komodo dan nikmati pantai Pink Beach yang eksotis bersama Wisata Nusantara.",
        images: [
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"
        ],
        itinerary: ["Hari 1: Labuan Bajo - Pulau Kelor", "Hari 2: Pulau Padar - Pink Beach", "Hari 3: Manta Point - Kanawa", "Hari 4: Return"],
        facilities: ["Kapal Phinisi AC", "Alat Snorkeling", "Makan 3x"],
        includes: ["Tiket Taman Nasional", "Pemandu Lokal"],
        excludes: ["Flight Ticket"],
        meetingPoint: "Bandara Komodo, Labuan Bajo"
    },
    {
        id: 4,
        name: "Open Trip Bromo Mountain Trekking",
        destination: "Jawa Timur",
        province: "Jawa Timur",
        price: 1200000,
        quotaMin: 5,
        quotaUsed: 11,
        quotaMax: 15,
        schedule: ["20 Agu", "21 Agu", "22 Agu"],
        status: "Aktif",
        rating: 4.89,
        reviewCount: 110,
        duration: "3 Hari 2 Malam",
        tripType: "Open Trip",
        category: "Gunung",
        minParticipants: 5,
        availableSeats: 4,
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Petualangan trekking dan berburu sunrise indah di Bromo bersama tim Wisata Nusantara.",
        images: [
            "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600"
        ],
        itinerary: ["Hari 1: Malang - Tosari", "Hari 2: Sunrise Penanjakan - Kawah Bromo - Pasir Berbisik", "Hari 3: Kembali ke Malang"],
        facilities: ["Jeep 4x4", "Homestay AC", "Makan"],
        includes: ["Tiket Masuk Bromo"],
        excludes: ["Pengeluaran Pribadi"],
        meetingPoint: "Stasiun Malang"
    },
    {
        id: 5,
        name: "Private Trip Yogyakarta City Tour & Culture",
        destination: "DI Yogyakarta",
        province: "DI Yogyakarta",
        price: 850000,
        quotaMin: 2,
        quotaUsed: 22,
        quotaMax: 30,
        schedule: ["05 Agu", "06 Agu"],
        status: "Aktif",
        rating: 4.85,
        reviewCount: 140,
        duration: "2 Hari 1 Malam",
        tripType: "Private Trip",
        category: "City Tour",
        minParticipants: 2,
        availableSeats: 8,
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Kelilingi destinasi bersejarah di kota Jogja secara privat dan nyaman.",
        images: [
            "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600"
        ],
        itinerary: ["Hari 1: Keraton - Tamansari - Malioboro", "Hari 2: Borobudur / Prambanan - Transfer Out"],
        facilities: ["Mobil Private AC", "Driver & BBM"],
        includes: ["Tiket Objek Wisata"],
        excludes: ["Hotel & Flight"],
        meetingPoint: "Stasiun Tugu / Bandara YIA"
    },
    {
        id: 6,
        name: "Liburan Keluarga Santai Malang-Batu",
        destination: "Jawa Timur",
        province: "Jawa Timur",
        price: 2100000,
        quotaMin: 4,
        quotaUsed: 6,
        quotaMax: 10,
        schedule: ["25 Agu", "26 Agu", "27 Agu", "28 Agu"],
        status: "Aktif",
        rating: 4.90,
        reviewCount: 65,
        duration: "4 Hari 3 Malam",
        tripType: "Private Trip",
        category: "Keluarga Santai",
        minParticipants: 4,
        availableSeats: 4,
        providerName: "Wisata Nusantara",
        providerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        description: "Liburan keluarga yang ramah anak dan nyaman di Malang dan Batu.",
        images: [
            "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=600"
        ],
        itinerary: ["Hari 1: Arrival Malang - Museum Angkut", "Hari 2: Jatim Park 3 & Apple Picking", "Hari 3: Flora Wisata San Terra", "Hari 4: Oleh-oleh & Transfer"],
        facilities: ["Innova Reborn AC", "Hotel Bintang 4", "Breakfast"],
        includes: ["Tiket Seluruh Wahana"],
        excludes: ["Flight Ticket"],
        meetingPoint: "Bandara Abdulrachman Saleh, Malang"
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

function initApp() {
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

// 13. Render Home Screen & Popular Trips
function renderHomeScreenData() {
    const scrollContainer = document.getElementById("popular-trips-scroll");
    if (!scrollContainer) return;

    scrollContainer.innerHTML = "";
    packagesDB.slice(0, 3).forEach(pkg => {
        const cardHtml = `
            <div class="trip-card" onclick="viewTripDetail(${pkg.id})">
                <div class="card-img-wrapper">
                    <img src="${pkg.images[0]}" alt="${pkg.name}">
                    <span class="badge-tag ${pkg.tripType === 'Open Trip' ? 'badge-open' : 'badge-private'}">${pkg.tripType.toUpperCase()}</span>
                    <button class="btn-wishlist" onclick="event.stopPropagation(); toggleWishlist(this);"><i class="fa-regular fa-heart"></i></button>
                </div>
                <div class="card-body">
                    <h4>${pkg.name}</h4>
                    <div class="card-meta">
                        <i class="fa-solid fa-location-dot"></i> <span>${pkg.destination}</span>
                        <i class="fa-solid fa-star text-amber" style="margin-left: 8px;"></i> <strong>${pkg.rating}</strong>
                    </div>
                    <div class="card-specs">
                        <span><i class="fa-regular fa-clock"></i> ${pkg.duration}</span>
                        <span><i class="fa-solid fa-user-friends"></i> Min. ${pkg.minParticipants} org</span>
                    </div>
                    <hr class="card-divider">
                    <div class="card-footer">
                        <div class="price-col">
                            <span>Mulai dari</span>
                            <strong>${formatIDRCurrency(pkg.price)}</strong>
                        </div>
                        <button class="btn-detail">Detail</button>
                    </div>
                </div>
            </div>
        `;
        scrollContainer.insertAdjacentHTML("beforeend", cardHtml);
    });

    const recGrid = document.getElementById("recommendations-grid");
    if (recGrid) {
        recGrid.innerHTML = "";
        packagesDB.slice(1, 4).forEach(pkg => {
            const recHtml = `
                <div class="rec-item" onclick="viewTripDetail(${pkg.id})">
                    <img src="${pkg.images[0]}" alt="${pkg.name}">
                    <div class="rec-info">
                        <h5>${pkg.name}</h5>
                        <p class="loc"><i class="fa-solid fa-location-dot"></i> ${pkg.destination.split(',')[0]}</p>
                        <span class="price">${formatIDRCurrency(pkg.price)}</span>
                    </div>
                </div>
            `;
            recGrid.insertAdjacentHTML("beforeend", recHtml);
        });
    }
}

// 14. Render Trip List Screen with Search + Province + Category Filters
function renderTripListData(sortBy = "Terpopuler") {
    const searchInput = document.getElementById("txt-list-search");
    const searchVal = searchInput ? searchInput.value.toLowerCase() : "";
    
    let filtered = packagesDB.filter(pkg => {
        const matchesProvince = selectedProvinceFilter === "Semua" || pkg.province === selectedProvinceFilter || pkg.destination.includes(selectedProvinceFilter);
        const matchesCategory = selectedCategoryFilter === "Semua" || pkg.category === selectedCategoryFilter || pkg.tripType === selectedCategoryFilter;
        const matchesSearch = pkg.name.toLowerCase().includes(searchVal) || pkg.destination.toLowerCase().includes(searchVal);
        return matchesProvince && matchesCategory && matchesSearch;
    });

    if (sortBy === "Harga Terendah") {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "Harga Tertinggi") {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "Rating Tertinggi") {
        filtered.sort((a, b) => b.rating - a.rating);
    }

    const container = document.getElementById("trips-vertical-list");
    if (!container) return;

    container.innerHTML = "";
    const resCount = document.getElementById("lbl-result-count");
    if (resCount) resCount.innerText = `Menampilkan ${filtered.length} Paket Trip`;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-result" style="text-align: center; padding: 40px 0; color: var(--text-light);">
                <i class="fa-solid fa-search-minus" style="font-size: 48px; margin-bottom: 12px; color: #ccc;"></i>
                <h4 style="color: var(--text-dark); margin-bottom: 4px;">Trip tidak ditemukan</h4>
                <p style="font-size: 12px;">Coba atur ulang kata kunci atau filter provinsi/kategori.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(pkg => {
        const cardHtml = `
            <div class="trip-card" onclick="viewTripDetail(${pkg.id})">
                <div class="card-img-wrapper">
                    <img src="${pkg.images[0]}" alt="${pkg.name}">
                    <span class="badge-tag ${pkg.tripType === 'Open Trip' ? 'badge-open' : 'badge-private'}">${pkg.tripType.toUpperCase()}</span>
                    <button class="btn-wishlist" onclick="event.stopPropagation(); toggleWishlist(this);"><i class="fa-regular fa-heart"></i></button>
                </div>
                <div class="card-body">
                    <h4>${pkg.name}</h4>
                    <div class="card-meta">
                        <i class="fa-solid fa-location-dot"></i> <span>${pkg.destination}</span>
                        <i class="fa-solid fa-star text-amber" style="margin-left: 8px;"></i> <strong>${pkg.rating}</strong>
                    </div>
                    <div class="card-specs">
                        <span><i class="fa-regular fa-clock"></i> ${pkg.duration}</span>
                        <span><i class="fa-solid fa-user-friends"></i> Min. ${pkg.minParticipants} org</span>
                    </div>
                    <hr class="card-divider">
                    <div class="card-footer">
                        <div class="price-col">
                            <span>Mulai dari</span>
                            <strong>${formatIDRCurrency(pkg.price)}</strong>
                        </div>
                        <button class="btn-detail">Lihat Detail</button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", cardHtml);
    });
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
        const todayStr = new Date().toISOString().split('T')[0];
        dateInput.setAttribute("min", todayStr);
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
