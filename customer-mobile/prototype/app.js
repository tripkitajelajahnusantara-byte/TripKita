/* ==========================================
   TripKita Mobile Prototype Controller
   ========================================== */

// 1. Mock Database (corresponds to Go backend GORM Models)
const packagesDB = [
    {
        id: 1,
        name: "Open Trip Raja Ampat",
        destination: "Raja Ampat, Papua",
        price: 2750000,
        quotaUsed: 4,
        quotaMax: 16,
        schedule: ["25 Mei", "26 Mei", "27 Mei", "28 Mei", "29 Mei", "30 Mei", "31 Mei"],
        status: "Aktif",
        rating: 4.8,
        reviewCount: 120,
        duration: "4 Hari 3 Malam",
        tripType: "Open Trip",
        minParticipants: 4,
        availableSeats: 12,
        description: "Jelajahi keindahan surga tersembunyi di Raja Ampat. Nikmati laut biru jernih, gugusan pulau karst yang memukau, dan pengalaman snorkeling tak terlupakan bersama trip open trip seru ini!",
        images: [
            "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=600",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
            "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600",
            "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600"
        ],
        itinerary: [
            "Hari 1: Penjemputan di Bandara Sorong - Waisai - Check-in Resort",
            "Hari 2: Snorkeling di Pulau Wayag - Trekking Puncak Wayag - Lunch di Pantai",
            "Hari 3: Island Hopping Pianemo Viewpoint - Snorkeling Manta Point - Pasir Timbul",
            "Hari 4: Morning walk di Resort - Kembali ke Sorong - Airport Transfer"
        ],
        facilities: ["Resort AC", "Speedboat Premium", "Makan 3x Sehari", "Alat Snorkeling", "GoPro Documentation", "Pemandu Lokal"],
        includes: ["Pianemo Entry Fee", "Raja Ampat Pin Kartu", "Asuransi Perjalanan", "Transportasi Sorong - Resort PP"],
        excludes: ["Tiket Pesawat ke Sorong", "Pengeluaran Pribadi", "Tips Pemandu & Kru"],
        meetingPoint: "Bandara Domine Eduard Osok, Sorong"
    },
    {
        id: 2,
        name: "Open Trip Belitung",
        destination: "Belitung, Bangka Belitung",
        price: 1890000,
        quotaUsed: 2,
        quotaMax: 10,
        schedule: ["25 Mei", "28 Mei", "01 Jun"],
        status: "Aktif",
        rating: 4.6,
        reviewCount: 76,
        duration: "3 Hari 2 Malam",
        tripType: "Open Trip",
        minParticipants: 4,
        availableSeats: 8,
        description: "Nikmati keindahan pantai dengan formasi batu granit yang megah di Belitung. Jelajahi Pulau Lengkuas, mercusuar bersejarah, dan nikmati kuliner mie Belitung legendaris.",
        images: [
            "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"
        ],
        itinerary: [
            "Hari 1: Penjemputan Bandara - City Tour - Kuliner Mie Belitung - Sunset Pantai Tanjung Pendam",
            "Hari 2: Island Hopping: Pulau Batu Garuda, Pulau Lengkuas, Goa Kelayang",
            "Hari 3: Belanja Souvenir - Museum Kata Andrea Hirata - Bandara Transfer"
        ],
        facilities: ["Hotel Bintang 3", "Boat Wisata", "Makan sesuai Itinerary", "Life Jacket & Snorkel", "Dokumentasi", "Pemandu Lokal"],
        includes: ["Tiket Wisata", "Transport AC Darat", "Air Mineral"],
        excludes: ["Tiket Pesawat ke Belitung", "Pengeluaran Pribadi", "Tips Guide"],
        meetingPoint: "Bandara H.A.S. Hanandjoeddin, Tanjung Pandan"
    },
    {
        id: 3,
        name: "Open Trip Labuan Bajo",
        destination: "Labuan Bajo, NTT",
        price: 2190000,
        quotaUsed: 8,
        quotaMax: 20,
        schedule: ["25 Mei", "28 Mei", "01 Jun"],
        status: "Aktif",
        rating: 4.7,
        reviewCount: 98,
        duration: "3 Hari 2 Malam",
        tripType: "Open Trip",
        minParticipants: 4,
        availableSeats: 12,
        description: "Saksikan naga purba Komodo di habitat aslinya dan nikmati keindahan panorama Pulau Padar yang menakjubkan.",
        images: [
            "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=600"
        ],
        itinerary: [],
        facilities: [],
        includes: [],
        excludes: [],
        meetingPoint: "Bandara Komodo, Labuan Bajo"
    },
    {
        id: 4,
        name: "Private Trip Bali",
        destination: "Bali",
        price: 4950000,
        quotaUsed: 1,
        quotaMax: 4,
        schedule: ["Setiap Hari"],
        status: "Aktif",
        rating: 4.9,
        reviewCount: 64,
        duration: "5 Hari 4 Malam",
        tripType: "Private Trip",
        minParticipants: 2,
        availableSeats: 3,
        description: "Rasakan pengalaman eksklusif menjelajahi Bali. Dari pura Uluwatu yang romantis, keindahan alam Ubud yang tenang, hingga sunset spektakuler di Seminyak.",
        images: [
            "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600",
            "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600"
        ],
        itinerary: [],
        facilities: [],
        includes: [],
        excludes: [],
        meetingPoint: "Bandara I Gusti Ngurah Rai, Bali"
    },
    {
        id: 5,
        name: "Honeymoon Lombok",
        destination: "Lombok, NTB",
        price: 3250000,
        quotaUsed: 0,
        quotaMax: 2,
        schedule: ["Setiap Hari"],
        status: "Aktif",
        rating: 4.8,
        reviewCount: 52,
        duration: "4 Hari 3 Malam",
        tripType: "Honeymoon",
        minParticipants: 2,
        availableSeats: 2,
        description: "Paket bulan madu romantis di Lombok dan Gili Trawangan. Nikmati dinner romantis di tepi pantai, naik cidomo mengelilingi pulau, dan snorkeling romantis.",
        images: [
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"
        ],
        itinerary: [],
        facilities: [],
        includes: [],
        excludes: [],
        meetingPoint: "Bandara Internasional Lombok, Praya"
    }
];

// 2. Global Prototype Navigation State
let currentActivePackage = packagesDB[0]; // Default selected package
let currentActiveDate = "28 Mei 2024";
let currentGuestCount = 2; // Detail guest selection
let currentBookingGuests = 4; // Booking form guest selection
let isWishlistedState = false;

// 3. Document Elements and Setup
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    // 3.1 Initial Render
    renderHomeScreenData();
    renderTripListData();
    renderTripDetailData();
    renderBookingFormData();
    generateQRISCode();

    // 3.2 Navigation Handlers (Sidebar buttons)
    const sidebarButtons = document.querySelectorAll(".btn-screen");
    sidebarButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetScreenId = btn.getAttribute("data-target");
            switchScreen(targetScreenId);
        });
    });

    // 3.3 Navigation Handlers (Phone bottom bar icons)
    const bottomNavItems = document.querySelectorAll(".bottom-nav-bar .nav-item");
    bottomNavItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetScreenId = item.getAttribute("data-screen");
            if (targetScreenId) {
                switchScreen(targetScreenId);
            }
        });
    });

    // 3.4 Screen 1 Events (Home page)
    document.getElementById("btn-search-trips").addEventListener("click", () => {
        switchScreen("screen-list");
    });
    document.getElementById("btn-view-all-popular").addEventListener("click", () => {
        switchScreen("screen-list");
    });

    // Screen 1 Category Circle clicks
    const shortcutItems = document.querySelectorAll(".shortcut-item");
    shortcutItems.forEach(item => {
        item.addEventListener("click", () => {
            const cat = item.getAttribute("data-category");
            setListFilterCategory(cat);
            switchScreen("screen-list");
        });
    });

    // 3.5 Screen 2 Events (Trip List page)
    document.getElementById("btn-list-back").addEventListener("click", () => {
        switchScreen("screen-home");
    });
    
    // Sort dropdown toggling
    const sortDropdown = document.querySelector(".dropdown-sort");
    sortDropdown.addEventListener("click", (e) => {
        e.stopPropagation();
        sortDropdown.classList.toggle("open");
    });
    document.addEventListener("click", () => {
        sortDropdown.classList.remove("open");
    });

    // Sort options event listener
    const sortOptions = document.querySelectorAll(".sort-option");
    sortOptions.forEach(opt => {
        opt.addEventListener("click", (e) => {
            sortOptions.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            const sortVal = opt.getAttribute("data-sort");
            document.getElementById("selected-sort-label").innerText = sortVal;
            renderTripListData(sortVal);
        });
    });

    // Search input typing
    document.getElementById("txt-list-search").addEventListener("input", (e) => {
        renderTripListData();
    });

    // Category chips selection
    const chipsList = document.querySelectorAll(".chip");
    chipsList.forEach(chip => {
        chip.addEventListener("click", () => {
            chipsList.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            renderTripListData();
        });
    });

    // 3.6 Screen 3 Events (Detail page)
    document.getElementById("btn-detail-back").addEventListener("click", () => {
        switchScreen("screen-list");
    });

    // Wishlist togglers
    const wishlistToggles = document.querySelectorAll(".btn-wishlist-toggle");
    wishlistToggles.forEach(toggle => {
        toggle.addEventListener("click", () => {
            isWishlistedState = !isWishlistedState;
            wishlistToggles.forEach(t => {
                if (isWishlistedState) {
                    t.innerHTML = `<i class="fa-solid fa-heart" style="color: #ef4444;"></i>`;
                } else {
                    t.innerHTML = `<i class="fa-regular fa-heart"></i>`;
                }
            });
        });
    });

    // Detail tabs selection switcher
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const targetTabPaneId = btn.getAttribute("data-tab");
            
            const tabPanes = document.querySelectorAll(".tab-pane");
            tabPanes.forEach(pane => pane.classList.remove("active"));
            document.getElementById(targetTabPaneId).classList.add("active");
        });
    });

    // Participant controls on Detail screen
    document.getElementById("btn-detail-guest-minus").addEventListener("click", () => {
        if (currentGuestCount > 1) {
            currentGuestCount--;
            updateDetailPriceCalculation();
        }
    });
    document.getElementById("btn-detail-guest-plus").addEventListener("click", () => {
        if (currentGuestCount < currentActivePackage.availableSeats) {
            currentGuestCount++;
            updateDetailPriceCalculation();
        }
    });

    // Book Now button navigation
    document.getElementById("btn-book-now").addEventListener("click", () => {
        currentBookingGuests = currentGuestCount; // Carry over guests selection
        renderBookingFormData();
        switchScreen("screen-booking");
    });

    // 3.7 Screen 4 Events (Booking form)
    document.getElementById("btn-booking-back").addEventListener("click", () => {
        switchScreen("screen-detail");
    });

    // Autofill trigger
    document.getElementById("btn-autofill").addEventListener("click", () => {
        autoFillPrimaryTraveler();
    });

    // Booking participants controllers
    document.getElementById("btn-form-guest-minus").addEventListener("click", () => {
        if (currentBookingGuests > 1) {
            currentBookingGuests--;
            renderBookingFormData();
        }
    });
    document.getElementById("btn-form-guest-plus").addEventListener("click", () => {
        if (currentBookingGuests < currentActivePackage.quotaMax) {
            currentBookingGuests++;
            renderBookingFormData();
        }
    });

    // Submit Booking triggers payment page
    document.getElementById("btn-submit-booking").addEventListener("click", () => {
        const randomBookingCode = "TK-2824-" + Math.floor(1000 + Math.random() * 9000);
        document.getElementById("payment-booking-code").innerText = randomBookingCode;
        
        // Finalize pricing
        const totalCost = currentActivePackage.price * currentBookingGuests;
        document.getElementById("payment-total-price").innerText = formatIDRCurrency(totalCost);
        
        switchScreen("screen-payment");
    });

    // 3.8 Screen 5 Events (Payment page)
    document.getElementById("btn-payment-back").addEventListener("click", () => {
        switchScreen("screen-booking");
    });

    // Payment methods switcher tabs
    const payTabs = document.querySelectorAll(".pay-tab");
    payTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            payTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const targetPayPaneId = tab.getAttribute("data-paytab");
            const payPanes = document.querySelectorAll(".pay-pane");
            payPanes.forEach(p => p.classList.remove("active"));
            document.getElementById(targetPayPaneId).classList.add("active");
        });
    });

    // Help accordions toggle
    const accordionItems = document.querySelectorAll(".accordion-item");
    accordionItems.forEach(item => {
        item.querySelector(".accordion-header").addEventListener("click", () => {
            const isCurrentlyActive = item.classList.contains("active");
            accordionItems.forEach(i => i.classList.remove("active"));
            if (!isCurrentlyActive) {
                item.classList.add("active");
            }
        });
    });

    // Start payment countdown timer
    startPaymentTimer(23, 59, 59);
}

// 4. Helper Function: Switch Active Screen Viewport & Sync Sidebar and bottomNav
function switchScreen(screenId) {
    const screens = document.querySelectorAll(".screen");
    screens.forEach(s => s.classList.remove("active"));
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add("active");
        document.getElementById("viewport").scrollTop = 0;
    }

    // Sync Sidebar Active button state
    const sidebarButtons = document.querySelectorAll(".btn-screen");
    sidebarButtons.forEach(btn => {
        if (btn.getAttribute("data-target") === screenId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Sync Phone Bottom Bar Active state
    const bottomNavItems = document.querySelectorAll(".bottom-nav-bar .nav-item");
    bottomNavItems.forEach(item => {
        const itemScreen = item.getAttribute("data-screen");
        if (itemScreen === screenId) {
            item.classList.add("active");
        } else if (screenId === "screen-detail" && itemScreen === "screen-list") {
            // detail screen keeps List tab (Trip) active
            item.classList.add("active");
        } else if (screenId === "screen-payment" && itemScreen === "screen-booking") {
            // payment screen keeps Booking tab active
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });
}

// 5. Render Screen 1: Home page popular trips & recommendations lists
function renderHomeScreenData() {
    // 5.1 Popular Trips Scroll
    const scrollContainer = document.getElementById("popular-trips-scroll");
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

    // 5.2 Recommendations grid
    const recGrid = document.getElementById("recommendations-grid");
    recGrid.innerHTML = "";
    
    packagesDB.slice(1, 3).forEach(pkg => {
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

// 6. Render Screen 2: Trip list with dynamic search input filters and category chips
function renderTripListData(sortBy = "Terpopuler") {
    const searchVal = document.getElementById("txt-list-search").value.toLowerCase();
    
    // Find active chip category
    let activeCategory = "Semua";
    const activeChip = document.querySelector(".chip.active");
    if (activeChip) {
        activeCategory = activeChip.getAttribute("data-category");
    }

    // Filter DB
    let filtered = packagesDB.filter(pkg => {
        const matchesCategory = activeCategory === "Semua" || pkg.tripType === activeCategory;
        const matchesSearch = pkg.name.toLowerCase().includes(searchVal) || pkg.destination.toLowerCase().includes(searchVal);
        return matchesCategory && matchesSearch;
    });

    // Sort DB
    if (sortBy === "Harga Terendah") {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "Harga Tertinggi") {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "Rating Tertinggi") {
        filtered.sort((a, b) => b.rating - a.rating);
    }

    // Render HTML list
    const container = document.getElementById("trips-vertical-list");
    container.innerHTML = "";
    
    document.getElementById("lbl-result-count").innerText = `Menampilkan ${filtered.length} Paket Trip`;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-result" style="text-align: center; padding: 40px 0; color: var(--text-light);">
                <i class="fa-solid fa-search-minus" style="font-size: 48px; margin-bottom: 12px; color: #ccc;"></i>
                <h4 style="color: var(--text-dark); margin-bottom: 4px;">Destinasi tidak ditemukan</h4>
                <p style="font-size: 12px;">Coba gunakan kata kunci pencarian yang lain.</p>
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

function setListFilterCategory(categoryName) {
    const chipsList = document.querySelectorAll(".chip");
    chipsList.forEach(chip => {
        if (chip.getAttribute("data-category") === categoryName) {
            chip.classList.add("active");
        } else {
            chip.classList.remove("active");
        }
    });
    renderTripListData();
}

// 7. Render Screen 3: Trip detail pages dynamically
function viewTripDetail(packageId) {
    const pkg = packagesDB.find(p => p.id === packageId);
    if (pkg) {
        currentActivePackage = pkg;
        currentGuestCount = pkg.minParticipants; // set default to min participants
        renderTripDetailData();
        switchScreen("screen-detail");
    }
}

function renderTripDetailData() {
    const pkg = currentActivePackage;
    
    // Cover Image
    document.getElementById("detail-active-img").src = pkg.images[0];
    
    // Header carousel dots & count text
    document.getElementById("carousel-indicator").innerText = `1 / ${pkg.images.length || 1}`;
    const dotsContainer = document.getElementById("carousel-dots-list");
    dotsContainer.innerHTML = "";
    pkg.images.forEach((img, idx) => {
        dotsContainer.insertAdjacentHTML("beforeend", `<span class="dot ${idx === 0 ? 'active' : ''}"></span>`);
    });

    // Meta metadata text
    document.getElementById("detail-package-badge").innerText = pkg.tripType.toUpperCase();
    document.getElementById("detail-package-title").innerText = pkg.name;
    document.getElementById("detail-package-location").innerText = pkg.destination;
    document.getElementById("detail-package-rating").innerText = pkg.rating;
    document.getElementById("detail-package-reviews").innerText = `(${pkg.reviewCount} ulasan)`;

    // Summary specs icons
    document.getElementById("detail-summary-duration").innerText = pkg.duration;
    document.getElementById("detail-summary-type").innerText = pkg.tripType;
    document.getElementById("detail-summary-min").innerText = `${pkg.minParticipants} Orang`;
    document.getElementById("detail-summary-seats").innerText = `${pkg.availableSeats} Seat`;

    // Tab contents
    document.getElementById("detail-desc-text").innerText = pkg.description;
    
    // Itinerary List rendering
    const itineraryWrap = document.getElementById("detail-itinerary-list");
    itineraryWrap.innerHTML = "";
    if (pkg.itinerary && pkg.itinerary.length > 0) {
        pkg.itinerary.forEach(it => {
            itineraryWrap.insertAdjacentHTML("beforeend", `<li>${it}</li>`);
        });
    } else {
        itineraryWrap.innerHTML = "<p class='no-data-tab'>Jadwal perjalanan akan diperbarui oleh penyedia.</p>";
    }

    // Facilities chip grid
    const facWrap = document.getElementById("detail-facilities-list");
    facWrap.innerHTML = "";
    if (pkg.facilities && pkg.facilities.length > 0) {
        pkg.facilities.forEach(fac => {
            facWrap.insertAdjacentHTML("beforeend", `<span><i class="fa-solid fa-check text-teal"></i> ${fac}</span>`);
        });
    } else {
        facWrap.innerHTML = "<p class='no-data-tab'>Fasilitas terstandar.</p>";
    }

    // Include / Exclude lists
    const incWrap = document.getElementById("detail-include-list");
    const excWrap = document.getElementById("detail-exclude-list");
    incWrap.innerHTML = "";
    excWrap.innerHTML = "";
    if (pkg.includes && pkg.includes.length > 0) {
        pkg.includes.forEach(inc => incWrap.insertAdjacentHTML("beforeend", `<li><i class="fa-regular fa-circle-check"></i> ${inc}</li>`));
    }
    if (pkg.excludes && pkg.excludes.length > 0) {
        pkg.excludes.forEach(exc => excWrap.insertAdjacentHTML("beforeend", `<li><i class="fa-regular fa-circle-xmark"></i> ${exc}</li>`));
    }

    // Meeting Point
    document.getElementById("detail-meeting-title").innerText = pkg.meetingPoint;

    // Gallery horizontal images
    const galWrap = document.getElementById("detail-gallery-list");
    galWrap.innerHTML = "";
    pkg.images.forEach(img => {
        galWrap.insertAdjacentHTML("beforeend", `<img src="${img}" alt="Gallery Thumbnail">`);
    });

    // Departure Schedules Selection
    const schedWrap = document.getElementById("detail-schedule-list");
    schedWrap.innerHTML = "";
    pkg.schedule.forEach((date, index) => {
        const dateHtml = `
            <div class="date-card ${index === 0 ? 'active' : ''}" onclick="selectDepartureDate(this, '${date}')">
                <span class="day">${date.split(' ')[0]}</span>
                <span class="month">${date.split(' ')[1]}</span>
            </div>
        `;
        schedWrap.insertAdjacentHTML("beforeend", dateHtml);
    });

    // Default dates
    if (pkg.schedule.length > 0) {
        currentActiveDate = pkg.schedule[0] + " 2024";
    }

    // Reset guest inputs & pricing calculations
    document.getElementById("detail-guest-count").innerText = `${currentGuestCount} Orang`;
    updateDetailPriceCalculation();
}

function selectDepartureDate(cardElement, dateValue) {
    const cards = document.querySelectorAll(".date-card");
    cards.forEach(c => c.classList.remove("active"));
    cardElement.classList.add("active");
    currentActiveDate = dateValue + " 2024";
}

function updateDetailPriceCalculation() {
    document.getElementById("detail-guest-count").innerText = `${currentGuestCount} Orang`;
    
    // Price Tickers update
    const totalCost = currentActivePackage.price * currentGuestCount;
    const formattedPrice = formatIDRCurrency(totalCost);
    
    document.getElementById("detail-bottom-price").innerText = formattedPrice;
}

// 8. Render Screen 4: Booking forms list dynamically generated based on passenger headcount
function renderBookingFormData() {
    const pkg = currentActivePackage;
    
    // Mini header preview card
    document.getElementById("booking-pkg-img").src = pkg.images[0];
    document.getElementById("booking-pkg-badge").innerText = pkg.tripType.toUpperCase();
    document.getElementById("booking-pkg-title").innerText = pkg.name;
    document.getElementById("booking-pkg-location").innerHTML = `<i class="fa-solid fa-location-dot"></i> ${pkg.destination.split(',')[0]}`;
    document.getElementById("booking-pkg-rating").innerText = pkg.rating;
    document.getElementById("booking-pkg-duration").innerHTML = `<i class="fa-regular fa-clock"></i> ${pkg.duration}`;

    // Guests selectors
    document.getElementById("form-guest-count").innerText = `${currentBookingGuests} Orang`;

    // Dynamic passenger forms rendering
    const formsContainer = document.getElementById("passenger-forms-container");
    formsContainer.innerHTML = "";

    for (let i = 0; i < currentBookingGuests; i++) {
        const isFirst = i === 0;
        const accordionHtml = `
            <div class="passenger-form-card ${isFirst ? 'active' : ''}">
                <div class="accordion-bar" onclick="toggleFormAccordion(this)">
                    <div class="acc-title-col">
                        <span class="num-badge">${i + 1}</span>
                        <strong>Peserta ${i + 1}</strong>
                        ${isFirst ? '<span class="badge-type" style="padding: 2px 6px; font-size: 9px; margin-left: 6px;">Data Utama</span>' : ''}
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
                            <input type="tel" placeholder="Contoh: 0812 3456 7890" class="in-phone" id="val-phone-${i}">
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Jenis Kelamin</label>
                        <div class="input-wrap">
                            <i class="fa-solid fa-venus-mars"></i>
                            <select class="in-gender" id="val-gender-${i}">
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Tanggal Lahir</label>
                        <div class="input-wrap">
                            <i class="fa-regular fa-calendar-days"></i>
                            <input type="text" placeholder="Contoh: YYYY-MM-DD" class="in-birth" id="val-birth-${i}">
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Catatan Tambahan (Opsional)</label>
                        <div class="input-wrap">
                            <i class="fa-regular fa-clipboard"></i>
                            <input type="text" placeholder="Contoh: Alergi makanan, dll" class="in-notes" id="val-notes-${i}">
                        </div>
                    </div>
                </div>
            </div>
        `;
        formsContainer.insertAdjacentHTML("beforeend", accordionHtml);
    }

    // Dynamic Invoice Summary Box calculation
    document.getElementById("summary-trip-date").innerText = currentActiveDate;
    document.getElementById("summary-guests-count").innerText = `${currentBookingGuests} Orang`;
    document.getElementById("summary-unit-price").innerText = formatIDRCurrency(pkg.price);
    
    const totalCost = pkg.price * currentBookingGuests;
    document.getElementById("summary-total-price").innerText = formatIDRCurrency(totalCost);
    
    // Sticky bottom bar summary
    document.getElementById("booking-bottom-price").innerText = formatIDRCurrency(totalCost);
}

function toggleFormAccordion(barElement) {
    const parentCard = barElement.parentElement;
    const arrow = barElement.querySelector(".acc-arrow");
    const isCurrentlyActive = parentCard.classList.contains("active");
    
    // Collapse all
    const allCards = document.querySelectorAll(".passenger-form-card");
    allCards.forEach(c => {
        c.classList.remove("active");
        c.querySelector(".acc-arrow").className = "fa-solid fa-chevron-down acc-arrow";
    });

    if (!isCurrentlyActive) {
        parentCard.classList.add("active");
        arrow.className = "fa-solid fa-chevron-up acc-arrow";
    }
}

// 9. Autofill function for Screen 4
function autoFillPrimaryTraveler() {
    document.getElementById("val-name-0").value = "Budi Santoso";
    document.getElementById("val-email-0").value = "budi@email.com";
    document.getElementById("val-phone-0").value = "081234567890";
    document.getElementById("val-gender-0").value = "Laki-laki";
    document.getElementById("val-birth-0").value = "1990-05-15";
    document.getElementById("val-notes-0").value = "Alergi seafood, mohon diganti menu ayam";
    
    alert("Profil Traveler 1 Auto-Fill Berhasil!");
}

// 10. Timer helper for Screen 5
function startPaymentTimer(hours, minutes, seconds) {
    let totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const timerText = document.getElementById("countdown-timer");

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

        const pad = (num) => String(num).padLeft(2, '0');
        timerText.innerText = `${pad(h)}:${pad(m)}:${pad(s)}`;
    }, 1000);
}

// Helper pad left string function
String.prototype.padLeft = function(size, char) {
    var s = this;
    while (s.length < (size || 2)) {s = char + s;}
    return s;
};

// 11. Custom QR Code Pattern drawing onto canvas (QRIS layout mock)
function generateQRISCode() {
    const canvas = document.getElementById("qris-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Anchor Squares (corners)
    ctx.fillStyle = "#000000";
    // Top-Left Anchor
    ctx.fillRect(5, 5, 45, 45);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(11, 11, 33, 33);
    ctx.fillStyle = "#000000";
    ctx.fillRect(17, 17, 21, 21);

    // Top-Right Anchor
    ctx.fillRect(width - 50, 5, 45, 45);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(width - 44, 11, 33, 33);
    ctx.fillStyle = "#000000";
    ctx.fillRect(width - 38, 17, 21, 21);

    // Bottom-Left Anchor
    ctx.fillRect(5, height - 50, 45, 45);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(11, height - 44, 33, 33);
    ctx.fillStyle = "#000000";
    ctx.fillRect(17, height - 38, 21, 21);

    // Bottom-Right small anchor
    ctx.fillRect(width - 35, height - 35, 30, 30);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(width - 29, height - 29, 18, 18);
    ctx.fillStyle = "#000000";
    ctx.fillRect(width - 24, height - 24, 8, 8);

    // Draw random bit dots in grid to represent QR data
    ctx.fillStyle = "#000000";
    const cellSize = 5;
    for (let y = 55; y < height - 55; y += cellSize * 1.5) {
        for (let x = 10; x < width - 10; x += cellSize * 1.5) {
            if ((x + y) % 3 === 0 || (x * y) % 5 === 1) {
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }
}

// 12. Helper utility format price
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
