/**
 * TC Travels Mysore - Unified Application Controller
 * Handles Dynamic Home Slider, Dynamic Packages, Dynamic Driver Services,
 * Dynamic Vehicle Catalog, and Real-Time Admin Data Synchronization
 */

document.addEventListener('DOMContentLoaded', async () => {
  await loadServerData();
  initMobileNavigation();
  initHomePackageCarousel();
  initVehiclesCatalog();
  initTourPackagesPage();
  initDriverServicesPage();
  initContactForm();
  updateCompanyLinks();
});

/* ==========================================================================
   0. REAL-TIME DATA SYNC FROM SERVER API
   ========================================================================== */
async function loadServerData() {
  // 1. Check local browser storage for admin portal modifications (works on GitHub Pages)
  try {
    const localData = localStorage.getItem('tc_travels_custom_data');
    if (localData) {
      const parsed = JSON.parse(localData);
      if (parsed && parsed.company && parsed.fleet) {
        window.TC_DATA = parsed;
      }
    }
  } catch (e) {}

  // 2. If running on Node.js backend or relative API, sync latest server data
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const data = await res.json();
      if (data && data.company && data.fleet) {
        window.TC_DATA = data;
      }
    }
  } catch (err) {
    // Graceful fallback to static TC_DATA
  }
}

/* ==========================================================================
   1. MOBILE NAVIGATION TOGGLE
   ========================================================================== */
function initMobileNavigation() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const navMenu = document.getElementById('navMenuBar');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      toggleBtn.innerText = navMenu.classList.contains('open') ? '✕' : '☰';
    });
  }
}

/* ==========================================================================
   2. COMPANY CONTACT LINKS SYNC
   ========================================================================== */
function updateCompanyLinks() {
  const company = (typeof TC_DATA !== 'undefined' && TC_DATA.company) ? TC_DATA.company : {};
  const rawPhone = company.phone || "9741422544";
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const formattedPhone = rawPhone.startsWith('+') ? rawPhone : (rawPhone.length === 10 ? `+91 ${rawPhone}` : rawPhone);
  const waNumber = company.whatsappNumber || "919741422544";

  document.querySelectorAll('.js-phone-link').forEach(el => {
    el.href = `tel:${cleanPhone}`;
    const span = el.querySelector('span');
    if (span) {
      span.innerText = formattedPhone;
    }
  });

  document.querySelectorAll('.js-whatsapp-link').forEach(el => {
    const defaultMsg = encodeURIComponent("Hello TC Travels Mysore, I want to inquire about vehicle rentals / personal driver services.");
    el.href = `https://wa.me/${waNumber}?text=${defaultMsg}`;
  });
}

function getActiveWhatsAppNumber() {
  return (typeof TC_DATA !== 'undefined' && TC_DATA.company && TC_DATA.company.whatsappNumber) 
    ? TC_DATA.company.whatsappNumber 
    : "919741422544";
}

/* ==========================================================================
   3. PACKAGES CAROUSEL (Dynamic Home Page Slider)
   ========================================================================== */
function initHomePackageCarousel() {
  const track = document.getElementById('carouselTrack');
  const prevBtn = document.getElementById('sliderPrevBtn');
  const nextBtn = document.getElementById('sliderNextBtn');
  const dotsContainer = document.getElementById('sliderDotsRow');
  const carouselWrapper = document.getElementById('packageCarousel');

  if (!track || typeof TC_DATA === 'undefined') return;

  // Dynamically render slides from TC_DATA.tours + Fleet slide + Driver slide
  const tours = TC_DATA.tours || [];
  let slidesHtml = tours.map(tour => `
    <div class="carousel-slide">
      <div class="slide-img-box">
        <img src="${tour.image || 'images/mysore-palace.jpg'}" alt="${tour.title}" class="slide-img" loading="lazy">
        <span class="slide-badge-category">Tour Package</span>
      </div>
      <div class="slide-content-box">
        <div>
          <h3 class="slide-package-title">${tour.title}</h3>
          <div class="slide-duration">⏱ ${tour.duration}</div>
          <p class="slide-desc">${tour.highlights || 'Doorstep Mysore pickup & drop with polite experienced driver.'}</p>
          <div class="slide-places-pills">
            ${(tour.places || []).map(p => `<span class="place-pill">📍 ${p}</span>`).join('')}
          </div>
        </div>
        <div class="slide-pricing-footer">
          <div>
            <div class="price-label">Tour Package Starts</div>
            <div class="price-amount">${tour.priceStarting}</div>
          </div>
          <button type="button" class="btn-book-slide" onclick="bookSlidePackage('${tour.title}', '${tour.duration} (${tour.priceStarting})')">
            Book on WhatsApp
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Add Outstation Fleet Slide
  slidesHtml += `
    <div class="carousel-slide">
      <div class="slide-img-box">
        <img src="images/innova-crysta.jpg" alt="Per-KM Vehicle Rentals" class="slide-img" loading="lazy">
        <span class="slide-badge-category">Vehicle Rentals (Per-KM)</span>
      </div>
      <div class="slide-content-box">
        <div>
          <h3 class="slide-package-title">All Vehicles for Rent (Per-KM Rates)</h3>
          <div class="slide-duration">⚡ Mandatory Daily Limits: 250 KM (Sedans) / 300 KM (Innova & Tempo)</div>
          <p class="slide-desc">
            Rent clean, air-conditioned cabs with courteous Kannada & Hindi speaking drivers. Choose from Dzire, Etios, Ertiga, Innova Crysta, or Tempo Travellers at standard per-km rates.
          </p>
          <div class="slide-places-pills">
            <span class="place-pill">🚗 Dzire: ₹11/km</span>
            <span class="place-pill">🚙 Etios: ₹12/km</span>
            <span class="place-pill">🚐 Ertiga: ₹14/km</span>
            <span class="place-pill">👑 Innova Crysta: ₹18/km</span>
            <span class="place-pill">🚌 Tempo: ₹22-26/km</span>
          </div>
        </div>
        <div class="slide-pricing-footer">
          <div>
            <div class="price-label">Outstation Rates From</div>
            <div class="price-amount">₹ 11 <span style="font-size: 0.95rem; font-weight: 700; color: #64748B;">/ KM</span></div>
          </div>
          <button type="button" class="btn-book-slide" onclick="bookSlidePackage('Per-KM Vehicle Rental Fleet', 'Outstation Per-KM Cabs (From ₹11/km)')">
            Book on WhatsApp
          </button>
        </div>
      </div>
    </div>
  `;

  // Add Personal Driver Slide
  slidesHtml += `
    <div class="carousel-slide">
      <div class="slide-img-box">
        <img src="images/maruti-dzire.jpg" alt="Personal Driver for Your Car" class="slide-img" loading="lazy">
        <span class="slide-badge-category">Acting Driver Service</span>
      </div>
      <div class="slide-content-box">
        <div>
          <h3 class="slide-package-title">Hire a Personal Driver for Your Own Car</h3>
          <div class="slide-duration">👨‍✈️ City Shopping &bull; Weddings &bull; Ghat Roads &bull; Night Drops</div>
          <p class="slide-desc">
            Have your own car but want a stress-free journey? Hire our police-verified, experienced chauffeurs. Expert in Manual & Automatic cars, ghat sections (Ooty/Coorg), and city traffic.
          </p>
          <div class="slide-places-pills">
            <span class="place-pill">⏱️ 4 Hours City: ₹499</span>
            <span class="place-pill">☀️ Full Day 8 Hours: ₹899</span>
            <span class="place-pill">⛰️ Outstation 24h: ₹1,199/day</span>
            <span class="place-pill">🌙 Night Safe Drop: ₹699</span>
          </div>
        </div>
        <div class="slide-pricing-footer">
          <div>
            <div class="price-label">Driver Charges From</div>
            <div class="price-amount">₹ 499</div>
          </div>
          <button type="button" class="btn-book-slide" onclick="bookSlidePackage('Personal Driver for My Own Car', 'Acting Driver Service (From ₹499)')">
            Book on WhatsApp
          </button>
        </div>
      </div>
    </div>
  `;

  track.innerHTML = slidesHtml;

  const slides = track.querySelectorAll('.carousel-slide');
  const totalSlides = slides.length;
  if (totalSlides === 0) return;

  let currentSlide = 0;
  let autoSlideTimer = null;

  // Render dots
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button');
      dot.className = `slider-dot ${i === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(i);
        restartAutoSlide();
      });
      dotsContainer.appendChild(dot);
    }
  }

  function updateSlidePosition() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.slider-dot');
      dots.forEach((d, idx) => {
        if (idx === currentSlide) {
          d.classList.add('active');
        } else {
          d.classList.remove('active');
        }
      });
    }
  }

  function goToSlide(index) {
    currentSlide = (index + totalSlides) % totalSlides;
    updateSlidePosition();
  }

  function nextSlide() {
    goToSlide(currentSlide + 1);
  }

  function prevSlide() {
    goToSlide(currentSlide - 1);
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      nextSlide();
      restartAutoSlide();
    };
  }

  if (prevBtn) {
    prevBtn.onclick = () => {
      prevSlide();
      restartAutoSlide();
    };
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      nextSlide();
      restartAutoSlide();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
      restartAutoSlide();
    }
  });

  // Touch Swipe
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
      restartAutoSlide();
    }
  }, { passive: true });

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideTimer = setInterval(nextSlide, 5000);
  }

  function stopAutoSlide() {
    if (autoSlideTimer) {
      clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
  }

  function restartAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
  }

  if (carouselWrapper) {
    carouselWrapper.onmouseenter = stopAutoSlide;
    carouselWrapper.onmouseleave = startAutoSlide;
  }

  updateSlidePosition();
  startAutoSlide();
}

/* ==========================================================================
   4. VEHICLES CATALOG (vehicles.html)
   ========================================================================== */
function initVehiclesCatalog() {
  const container = document.getElementById('vehiclesCatalogGrid');
  const tabsContainer = document.getElementById('vehicleFilterTabs');
  if (!container || typeof TC_DATA === 'undefined') return;

  function renderVehicles(category = 'all') {
    const list = category === 'all' 
      ? TC_DATA.fleet 
      : TC_DATA.fleet.filter(c => c.category === category);

    if (list.length === 0) {
      container.innerHTML = '<div style="padding: 30px; text-align: center; color: #64748B; background: #FFF; border-radius: 8px;">No vehicles in this category.</div>';
      return;
    }

    container.innerHTML = list.map(car => `
      <div class="vehicle-catalog-card" data-category="${car.category}">
        <div class="vehicle-card-img-wrap">
          <img src="${car.image}" alt="${car.name}" class="vehicle-card-img" loading="lazy">
          <span class="card-tag-pill">${car.tag}</span>
        </div>
        <div class="vehicle-card-body">
          <div>
            <h3 class="v-title">${car.name}</h3>
            <div class="v-cat-badge">${car.categoryLabel} &bull; ${car.transmission} &bull; ${car.fuel}</div>

            <div class="v-specs-pills">
              <span>👥 ${car.seats}</span>
              <span>🧳 ${car.luggage}</span>
              <span>❄️ ${car.ac}</span>
            </div>

            <ul class="v-features-list">
              ${(car.features || []).map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>

          <div class="v-pricing-box">
            <div class="v-rate-main">${car.pricePerKm} <span>/ KM Outstation</span></div>
            <div class="v-mandatory-pill">⚡ ${car.minKmPerDay}</div>
            <div class="v-local-note">
              Driver Batta: <strong>${car.driverBatta}</strong> &bull; Local: <strong>${car.localPackagePrice}</strong>
            </div>
            <button type="button" class="btn-card-wa" onclick="bookVehicle('${car.name}', '${car.pricePerKm}/km (${car.minKmPerDay})')">
              Book on WhatsApp
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  if (tabsContainer) {
    tabsContainer.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.onclick = () => {
        tabsContainer.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderVehicles(btn.dataset.cat);
      };
    });
  }

  renderVehicles('all');
}

/* ==========================================================================
   5. TOUR PACKAGES PAGE (packages.html)
   ========================================================================== */
function initTourPackagesPage() {
  const container = document.getElementById('tourPackagesContainer');
  if (!container || typeof TC_DATA === 'undefined') return;

  const tours = TC_DATA.tours || [];
  if (tours.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748B;">No tour packages available at the moment.</div>';
    return;
  }

  container.innerHTML = tours.map(tour => `
    <div class="package-detailed-card">
      <div class="pkg-img-wrap">
        <img src="${tour.image || 'images/mysore-palace.jpg'}" alt="${tour.title}" class="pkg-img" loading="lazy">
        <span class="card-tag-pill">Featured Tour</span>
      </div>
      <div class="pkg-content">
        <div>
          <div style="color: var(--cta-orange); font-size: 0.8rem; font-weight: 800; text-transform: uppercase;">Tour Package</div>
          <h2 style="font-family: var(--font-heading); font-size: 1.65rem; font-weight: 900; color: var(--text-dark); margin: 4px 0 8px;">
            ${tour.title}
          </h2>
          <div style="color: #B45309; font-weight: 800; font-size: 0.88rem; margin-bottom: 14px;">
            ⏱ ${tour.duration}
          </div>
          <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.6; margin-bottom: 16px;">
            ${tour.highlights || 'Scenic tour with courteous driver, flexible stops, and comfortable travel.'}
          </p>
          <div class="slide-places-pills">
            ${(tour.places || []).map(p => `<span class="place-pill">📍 ${p}</span>`).join('')}
          </div>
        </div>
        <div class="slide-pricing-footer">
          <div>
            <div class="price-label">Starting Package Price</div>
            <div class="price-amount">${tour.priceStarting}</div>
          </div>
          <button type="button" class="btn-book-slide" onclick="bookSlidePackage('${tour.title}', '${tour.duration} (${tour.priceStarting})')">
            Book on WhatsApp
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   6. DRIVER SERVICES PAGE (drivers.html)
   ========================================================================== */
function initDriverServicesPage() {
  const container = document.getElementById('driverServicesContainer');
  if (!container || typeof TC_DATA === 'undefined') return;

  const services = TC_DATA.driverServices || [];
  if (services.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748B;">No driver services listed.</div>';
    return;
  }

  container.innerHTML = services.map(d => `
    <div class="driver-card">
      <div>
        <span class="d-badge">${d.badge || 'Verified Driver'}</span>
        <h3 class="d-title">${d.title}</h3>
        <div class="d-duration">⏱ ${d.duration}</div>
        <p class="d-desc">${d.subtitle || 'Experienced acting driver for your personal car in Mysore.'}</p>
        <ul class="d-features">
          ${(d.features || []).map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      <div class="d-price-row">
        <div>
          <div style="font-size: 0.72rem; color: #64748B; text-transform: uppercase; font-weight: 700;">Rate</div>
          <div class="d-price">${d.price}</div>
          <div style="font-size: 0.72rem; color: #94A3B8;">${d.overtime ? 'Overtime: ' + d.overtime : ''}</div>
        </div>
        <button type="button" class="btn-head-wa" onclick="bookPersonalDriver('${d.title} (${d.price})')">
          Book on WhatsApp
        </button>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   7. CONTACT FORM DISPATCH (contact.html)
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('contactBookingForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName')?.value.trim() || 'Valued Customer';
    const phone = document.getElementById('contactPhone')?.value.trim() || '';
    const service = document.getElementById('contactService')?.value || 'Tour / Cab Inquiry';
    const date = document.getElementById('contactDate')?.value || 'Flexible';
    const pickup = document.getElementById('contactPickup')?.value.trim() || 'Mysore';
    const notes = document.getElementById('contactNotes')?.value.trim() || 'N/A';

    const message = `Hello TC Travels Mysore,\n\nI want to book / inquire:\n👤 Name: *${name}*\n📱 Mobile: *${phone}*\n🚗 Service: *${service}*\n📅 Travel Date: *${date}*\n📍 Pickup Location: *${pickup}*\n📝 Notes: *${notes}*\n\nPlease confirm availability and rate quote.`;

    const waNumber = getActiveWhatsAppNumber();
    const encoded = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(encoded, '_blank');
  });
}

/* ==========================================================================
   8. 1-TAP WHATSAPP BOOKING HELPERS
   ========================================================================== */
function bookSlidePackage(packageName, packageDetails) {
  const waNumber = getActiveWhatsAppNumber();
  const message = `Hello TC Travels Mysore,\n\nI want to inquire and book:\n📍 Package: *${packageName}*\n⏱ Details: ${packageDetails}\n\nPlease share availability, vehicle options, and final quote.`;
  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

function bookVehicle(vehicleName, rateDetails) {
  const waNumber = getActiveWhatsAppNumber();
  const message = `Hello TC Travels Mysore,\n\nI want to rent vehicle:\n🚗 Vehicle: *${vehicleName}*\n💰 Rate: ${rateDetails}\n\nPlease share availability and booking details.`;
  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

function bookPersonalDriver(serviceName) {
  const waNumber = getActiveWhatsAppNumber();
  const message = `Hello TC Travels Mysore,\n\nI need a Personal Driver for my own car:\n👨‍✈️ Service: *${serviceName}*\n\nPlease provide a verified driver for my car.`;
  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank');
}
