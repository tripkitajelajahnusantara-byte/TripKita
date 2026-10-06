// Browser smoke test with synthetic API responses; never uses a real account.
// Run with NODE_PATH pointing at a runtime containing Playwright and Vite at 5183.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(__dirname, '../artifacts/pickup-departures');
fs.mkdirSync(output, { recursive: true });
const day = offset => { const d = new Date(); d.setUTCDate(d.getUTCDate()+offset); return d.toISOString().slice(0,10); };
const first = day(10), second = day(40), third = day(70);
const end = start => { const d=new Date(`${start}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+2);return d.toISOString().slice(0,10); };
const pkg={ id:97, providerId:7, name:'Dieng 3 Hari • Jelajah Dataran Tinggi', destination:'Jawa Tengah', category:'Alam', tripType:'Open Trip', price:999000, quotaMin:10, quotaMax:15, quotaUsed:20, duration:3, minGuests:1, maxGuests:15, minAge:0, maxAge:100, status:'Aktif', startDate:first,endDate:end(third), schedule:'Berangkat malam, jam jemput disepakati dengan mitra.', description:'Nikmati matahari terbit, telaga dan desa di dataran tinggi Dieng.', includedFacilities:'Transportasi\nPenginapan\nPemandu', excludedFacilities:'Pengeluaran pribadi', itinerary:'[{"day":1,"activities":[{"time":"20:00","title":"Penjemputan peserta"}]}]', pickupMode:'FLEXIBLE', pickupArea:'Jabodetabek, sepanjang rute Bekasi–Cikampek menuju Dieng', pickupNotes:'Lokasi harus searah. Jam jemput dikonfirmasi melalui WhatsApp sebelum keberangkatan.', pickupPoints:['Jakarta, RS UKI','Bogor, Exit Tol Citeureup','Bekasi, Exit Tol Barat'],departureDates:[first,second,third], departures:[{date:first,endDate:end(first),quotaUsed:15,seatsLeft:0},{date:second,endDate:end(second),quotaUsed:5,seatsLeft:10},{date:third,endDate:end(third),quotaUsed:0,seatsLeft:15}] };
let role='PROVIDER'; let saved; let savedBooking;
const profile=()=>({id:7,role,businessName:role==='PROVIDER'?'Jelajah Nusantara':'Budi Santoso',picName:'Budi Santoso',email:'qa@example.invalid',whatsapp:'+6281234567890',birthDate:'1995-04-12',gender:'Laki-laki',status:'APPROVED',isVerified:true});
const main=async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 await context.addInitScript(()=>{sessionStorage.setItem('tementrip_partner_token','synthetic-qa');sessionStorage.setItem('tementrip_customer_token','synthetic-qa');localStorage.setItem('tementrip_provider_tour_seen','true');localStorage.setItem('tementrip_customer_terms_accepted_7','true');});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.includes('/api/v1/')) {
    let data={}; const p=url.pathname;
    if(p.endsWith('/provider/profile')) data=profile();
    else if(p.endsWith('/public/checkout-config')) data={serviceFee:5000,paymentWindowSeconds:86400,adminReviewWindowSeconds:86400,cancellationRefundDays:7,manualPayment:{bankName:'Bank QA',accountNumber:'0000',accountHolder:'Demo'}};
    else if(p.endsWith('/public/packages')||p.endsWith('/provider/packages')) data=[pkg];
    else if(p.endsWith('/provider/packages/97')) { data=pkg; if(req.method()==='PUT') { saved=req.postDataJSON(); data={...pkg,...saved}; } }
    else if(p.includes('/public/providers/')) data={id:7,businessName:'Jelajah Nusantara',operationalCity:'Jakarta',rating:4.8};
    else if(p.includes('/reviews/')||p.endsWith('/notifications')||p.endsWith('/departures'))data=[];
    else if(p.endsWith('/public/bookings')&&req.method()==='POST') {savedBooking=req.postDataJSON();data={...savedBooking,id:8,bookingCode:'TK-QA',status:'PENDING_PAYMENT',createdAt:new Date().toISOString()};}
    else if(p.endsWith('/customer/bookings')) data=[];
    return route.fulfill({json:data});
  }
  if(url.host!=='127.0.0.1:5183'&&!url.protocol.startsWith('data')) return route.abort();
  return route.continue();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5183/#/provider/kelola-paket');
 await page.getByText(pkg.name,{exact:true}).first().waitFor();
 await page.getByRole('button',{name:/Edit|Sunting/}).first().click();
 await page.getByLabel('Area / rute yang dilayani').waitFor();
 await page.getByLabel('Area / rute yang dilayani').fill(pkg.pickupArea);
 await page.screenshot({path:path.join(output,'provider-pickup-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Jadwal & Harga'}).click();
 await page.getByText('Tambah jadwal mingguan sekaligus',{exact:true}).click();
 await page.getByRole('button',{name:'Tambahkan ke kalender'}).click();
 assert.ok((await page.locator('.trip-option-chips button[aria-label^="Hapus"]').count())>3);
 await page.screenshot({path:path.join(output,'provider-schedules-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('.availability-calendar-days').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),7,'Calendar must retain seven columns on mobile');
 await page.screenshot({path:path.join(output,'provider-schedules-mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'Provider schedule overflows on mobile');
 await page.setViewportSize({width:1440,height:1100});
 await page.getByRole('button',{name:'Simpan Draft',exact:true}).click();
 await page.waitForFunction(()=>document.body.innerText.includes('Berhasil')||document.body.innerText.includes('berhasil'));
 assert.equal(saved.pickupMode,'FLEXIBLE');assert.ok(saved.departureDates.length>3);assert.equal(saved.meetingPointLatitude,null);
 await page.getByRole('button',{name:'Lihat Daftar Paket'}).click();
 role='CUSTOMER';
 await page.goto('http://127.0.0.1:5183/#/paket-detail?id=97');
 await page.getByRole('group',{name:'Pilih tanggal keberangkatan'}).waitFor();
 const choices=page.locator('.departure-row');await choices.nth(2).waitFor();assert.equal(await choices.count(),3);assert.equal(await choices.nth(0).isDisabled(),true);
 await choices.nth(2).click();assert.equal(await choices.nth(2).getAttribute('aria-pressed'),'true');
 await page.screenshot({path:path.join(output,'customer-package-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'+',exact:true}).click();
 await page.getByRole('button',{name:/Pesan Sekarang/}).click();
 await page.locator('#pickup-0-choice').waitFor();
 await page.locator('#pickup-0-choice').selectOption('Jakarta, RS UKI');
 await page.getByPlaceholder('Nama peserta 2...').fill('Siti Aminah');
 await page.getByRole('textbox',{name:'Nomor HP Peserta 2 tanpa kode negara'}).fill('81234567891');
 await page.locator('form select').filter({has:page.locator('option[value="Laki-laki"]')}).nth(2).selectOption('Perempuan');
 await page.locator('form input[type="date"]').nth(2).fill('1996-01-10');
 await page.getByRole('button',{name:'Samakan dengan peserta pertama'}).click();
 assert.equal(await page.locator('#pickup-1-choice').inputValue(),'Jakarta, RS UKI');
 await page.locator('#pickup-1-choice').selectOption('');
 await page.locator('#pickup-1').fill('Depan Stasiun Bekasi, pintu selatan');
 await page.screenshot({path:path.join(output,'customer-checkout-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(output,'customer-checkout-mobile.png'),fullPage:true});
 const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 assert.ok(overflow.scroll<=overflow.client+1,`Checkout overflows: ${JSON.stringify(overflow)}`);
 await page.getByRole('button',{name:'Lanjut ke Konfirmasi Pemesanan'}).click();
 await page.getByRole('heading',{name:'Titik jemput yang diajukan'}).waitFor();
 assert.ok((await page.locator('.pickup-manifest').innerText()).includes('Depan Stasiun Bekasi, pintu selatan'));
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:path.join(output,'customer-confirmation-mobile.png'),fullPage:true});
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Konfirmasi & Bayar Sekarang',exact:true}).click();
 await page.getByRole('button',{name:'Ya, Bayar Sekarang',exact:true}).click();
 await page.waitForURL('**/halaman-pembayaran?code=TK-QA');
 assert.equal(savedBooking.guests,2);assert.equal(savedBooking.tripDate,`${third}T08:00:00+07:00`);
 assert.deepEqual(savedBooking.participants.map(p=>p.pickupPoint),['Jakarta, RS UKI','Depan Stasiun Bekasi, pintu selatan']);
 await page.goto('http://127.0.0.1:5183/#/paket-detail?id=97');
 await page.locator('.departure-row').first().waitFor();
 await page.screenshot({path:path.join(output,'customer-package-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1100});
 console.log(JSON.stringify({result:'passed',errors,screenshots:output,schedules:saved.departureDates.length}));
 assert.deepEqual(errors,[]);
 } finally { await browser.close(); }
};
main().catch(e=>{console.error(e);process.exitCode=1;});
