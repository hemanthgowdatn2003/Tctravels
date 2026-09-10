# TC Travels Mysore - Official Website

A luxury, high-converting responsive website for **TC Travels Mysore**, offering vehicle rentals, personal drivers for private cars, and Mysore tour packages.

## Features
- **Modern Luxury Design**: Mysore royal gold and deep sapphire theme with glassmorphism and responsive typography.
- **Vehicle Rental Catalog**: Interactive filterable showroom for Sedans (Dzire, Etios), MPVs & SUVs (Ertiga, Innova Crysta, Fortuner), and 12-17 Seater Tempo Travellers.
- **Personal Driver for Your Car ("Acting Driver")**: Dedicated packages for city errands, outstation family trips, ghat road journeys, and monthly chauffeurs.
- **Direct WhatsApp Booking Engine**: Automatically converts trip details and selected vehicle into a formatted WhatsApp booking message.
- **Mysore & Outstation Tour Packages**: Mysore Palace, Coorg, Ooty, and Bangalore Airport (BLR) taxi transfers.
- **Mobile Floating Action Bar**: 1-tap Call Now, WhatsApp, and Quick Booking buttons for mobile travelers.

## Quick Start
You can run this site using any static web server or open `index.html` directly in any web browser:

```powershell
# In PowerShell:
cd "d:\Tc travels"
python -m http.server 8080
```
Then visit `http://localhost:8080` in your web browser.

## Customizing Contact & Pricing
All phone numbers, WhatsApp numbers, pricing, vehicle fleet, and tour packages are centralized in `js/data.js`:
- Open `js/data.js`
- Update `TC_DATA.company.phone` and `TC_DATA.company.whatsappNumber` to your live phone numbers.
- Update fleet rates and package details whenever needed.
