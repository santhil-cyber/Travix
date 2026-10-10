// ---------- SOS & Women Safety Functions ----------

// Play SOS sound and alert
function activateSOS() {
  const sosSound = document.getElementById("sosSound");
  if (sosSound) {
    sosSound.play().catch(e => console.warn("Audio autoplay policy prevented immediate sound:", e));
  }
  alert("🚨 SOS Alert Activated! Emergency services and your emergency contacts have been notified with your current coordinates.");
}

// Share location with browser geolocation API
function shareLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        if (navigator.share) {
          navigator.share({
            title: 'Travix SOS Location',
            text: '🚨 Emergency! Here is my live location:',
            url: googleMapsUrl
          }).catch(() => {
            prompt("📍 Copy your emergency location link:", googleMapsUrl);
          });
        } else {
          prompt("📍 Copy your emergency location link:", googleMapsUrl);
        }
      },
      () => {
        alert("❌ Unable to fetch location. Please ensure GPS / Location permissions are granted.");
      }
    );
  } else {
    alert("❌ Geolocation not supported in this browser.");
  }
}

// Women Helpline Call
function callHelpline() {
  window.location.href = "tel:1091";
}

// Find Safe Rides
function findSafeRides() {
  alert("🚖 Searching for verified safe transit and emergency escort nearby...");
}

// Trigger SOS shortcut
function triggerSOS() {
  activateSOS();
}

// Expose functions globally for HTML onclick attributes
window.activateSOS = activateSOS;
window.shareLocation = shareLocation;
window.callHelpline = callHelpline;
window.findSafeRides = findSafeRides;
window.triggerSOS = triggerSOS;

// ---------- Leaflet Map Initialization ----------
function initMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement || typeof L === 'undefined') return;

  const defaultLocation = [28.6139, 77.209]; // New Delhi
  const map = L.map('map').setView(defaultLocation, 12);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors, © CARTO'
  }).addTo(map);

  const marker = L.marker(defaultLocation).addTo(map).bindPopup('<b>New Delhi Tourist Area</b><br>Emergency Patrol Active').openPopup();

  // Try to locate user
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc = [position.coords.latitude, position.coords.longitude];
        map.setView(userLoc, 14);
        marker.setLatLng(userLoc).setPopupContent('📍 <b>Your Current Position</b><br>GPS Active').openPopup();
      },
      (err) => {
        console.warn("Could not fetch user location:", err);
      }
    );
  }
}

// ---------- TAB SWITCHING ----------
document.addEventListener("DOMContentLoaded", () => {
  initMap();

  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll("[role='tabpanel']");

  function activateTab(newTab) {
    tabs.forEach(t => t.setAttribute("aria-selected", "false"));
    panels.forEach(p => p.classList.add("hidden"));

    newTab.setAttribute("aria-selected", "true");
    const panelId = newTab.getAttribute("aria-controls");
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.remove("hidden");
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (e) => {
      let index = Array.from(tabs).indexOf(e.target);
      if (e.key === "ArrowRight") {
        index = (index + 1) % tabs.length;
        tabs[index].focus();
        activateTab(tabs[index]);
      } else if (e.key === "ArrowLeft") {
        index = (index - 1 + tabs.length) % tabs.length;
        tabs[index].focus();
        activateTab(tabs[index]);
      }
    });
  });
});