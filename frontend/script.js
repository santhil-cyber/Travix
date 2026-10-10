document.addEventListener('DOMContentLoaded', () => {
    // --- API & Config ---
    const ZONES_API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ZONES_SERVER_URL)
        || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : '/api');
    const AUTH_API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_AUTH_SERVER_URL)
        || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '/api');

    const DEMO_RESIDENTS = [
        { uid: '111122223333', name: 'Rajesh Kumar', dob: '1990-05-15', role: 'user' },
        { uid: '222233334444', name: 'Sunita Sharma', dob: '1985-11-22', role: 'user' },
        { uid: '333344445555', name: 'Amit Singh', dob: '2001-01-30', role: 'authority' }
    ];

    // --- UI Elements ---
    const appContainer = document.getElementById('app-container');
    const logoutBtn = document.getElementById('logout-btn');
    const navItems = document.querySelectorAll('.nav-item');
    const homeContent = document.getElementById('home-content');
    const mapContainer = document.querySelector('.map-container');
    const locationsSidebar = document.getElementById('locations-sidebar');
    const collectionsSidebar = document.getElementById('collections-sidebar');
    const worldTravelSidebar = document.getElementById('world-travel-sidebar');
    const startAddZoneBtn = document.getElementById('start-add-zone-btn');
    const addZoneForm = document.getElementById('add-zone-form');
    const cancelAddZoneBtn = document.getElementById('cancel-add-zone-btn');
    const zoneListContainer = document.getElementById('zone-list-container');
    const createCollectionForm = document.getElementById('create-collection-form');
    const collectionListContainer = document.getElementById('collection-list-container');
    const addToCollectionModal = document.getElementById('add-to-collection-modal');
    const collectionsDropdown = document.getElementById('collections-dropdown');
    const confirmAddBtn = document.getElementById('confirm-add-btn');
    const globalWarningListContainer = document.getElementById('global-warning-list-container');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const searchInput = document.querySelector('.search-box input');

    // --- State Variables ---
    let currentUser = null;
    let captchaText = '';
    let map = null;
    let tileLayer = null;
    let tempMarker = null;
    let userMarker = null;
    let isAddMode = false;
    let newZoneCoords = null;
    let allZones = [];
    let allCollections = [];
    let activePage = 'home';
    let zoneLayers = { safe: null, warning: null, danger: null };
    let selectedZoneToAdd = null;
    let collectionsListenerUnsubscribe = null;
    let activeZoneTypes = { safe: true, warning: true, danger: true };
    let carouselInterval = null;
    let currentSlide = 0;

    // --- CAPTCHA LOGIC ---
    function generateCaptcha() {
        const canvas = document.getElementById('captcha-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        captchaText = Math.random().toString(36).substring(2, 8).toUpperCase();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#f0f2f5";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "30px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < captchaText.length; i++) {
            ctx.save();
            ctx.translate(25 + i * 20, canvas.height / 2);
            ctx.rotate((Math.random() - 0.5) * 0.4);
            ctx.fillText(captchaText[i], 0, 0);
            ctx.restore();
        }
    }

    // --- AUTHENTICATION & LOGIN ---
    async function loginAsUser(uid, name, role) {
        currentUser = { uid, email: name, role };
        await initializeApp(currentUser);
        const loginView = document.getElementById('login-view-container');
        if (loginView) loginView.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
    }

    async function requestAuth() {
        const statusEl = document.getElementById('login-status');
        const authButton = document.getElementById('auth-button');
        const aadhaarNumber = document.getElementById('aadhaarNumber').value.trim();
        const name = document.getElementById('name').value.trim();
        const dob = document.getElementById('dob').value.trim();
        const captchaInput = document.getElementById('captcha-input').value.toUpperCase().trim();

        if (aadhaarNumber.length !== 12 || !/^\d+$/.test(aadhaarNumber)) {
            statusEl.innerText = 'Error: Aadhaar number must be 12 digits.';
            statusEl.className = 'failure';
            return;
        }
        if (captchaInput !== captchaText) {
            statusEl.innerText = 'Error: CAPTCHA does not match.';
            statusEl.className = 'failure';
            generateCaptcha();
            return;
        }
        statusEl.innerText = 'Processing authentication...';
        statusEl.className = '';
        authButton.disabled = true;

        const authData = { aadhaarNumber, name, dob };

        try {
            const response = await fetch(`${AUTH_API_BASE_URL}/api/request-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authData)
            });
            if (response.ok) {
                const data = await response.json();
                await loginAsUser(aadhaarNumber, name, data.role || 'user');
                authButton.disabled = false;
                return;
            }
        } catch (networkError) {
            console.warn('Auth server not reached, checking demo database:', networkError);
        }

        // Demo profile fallback
        const matched = DEMO_RESIDENTS.find(r => r.uid === aadhaarNumber && r.name.toLowerCase() === name.toLowerCase());
        if (matched) {
            await loginAsUser(matched.uid, matched.name, matched.role);
            showNotification('info', 'Demo Profile Active', `Welcome, ${matched.name}! Signed in as ${matched.role}.`);
        } else {
            statusEl.innerText = 'Authentication Failed: No matching resident found. Use demo Aadhaar or buttons below.';
            statusEl.className = 'failure';
            generateCaptcha();
        }
        authButton.disabled = false;
    }

    function handleLogout() {
        currentUser = null;
        const loginView = document.getElementById('login-view-container');
        if (appContainer) appContainer.style.display = 'none';
        if (loginView) loginView.style.display = 'flex';
        generateCaptcha();
    }
    
    window.generateCaptcha = generateCaptcha;
    window.requestAuth = requestAuth;

    // --- APP INITIALIZATION (Called after successful login) ---
    async function initializeApp(user) {
        updateNavbar(user);
        document.body.className = user ? `${user.role}-view` : 'guest-view';
        if (localStorage.getItem('theme') === 'light') {
            document.body.classList.add('light-mode');
        }
        
        loadCollections();

        if (!map) {
            map = L.map('map', { attributionControl: false }).setView([28.6139, 77.2090], 10);
            const currentTheme = localStorage.getItem('theme') || 'dark';
            const tileUrl = currentTheme === 'light'
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
            tileLayer = L.tileLayer(tileUrl).addTo(map);
            zoneLayers = { safe: L.layerGroup().addTo(map), warning: L.layerGroup().addTo(map), danger: L.layerGroup().addTo(map) };
            setupMapEventListeners();
        }

        await fetchZones();

        const manageZonesSection = document.getElementById('manage-zones-section');
        if (manageZonesSection) {
            manageZonesSection.style.display = (user && user.role === 'authority') ? 'block' : 'none';
        }

        document.querySelector('.nav-item.active')?.classList.remove('active');
        document.querySelector('.nav-item[data-page="home"]')?.classList.add('active');
        renderHomePage();
        
        updateSafetyStats();
        
        if (user) {
            trackAndShowMyLocation();
        }

        initializeChatbot();
        initializeQuickActions();
    }

    // --- DEFAULT & PERSISTENT ZONES ---
    function getDefaultSafetyZones() {
        const baseZones = [
            { id: 'def_1', name: 'India Gate - High Security Tourist Zone', type: 'safe', lat: 28.6129, lng: 77.2295, radius: 2500, source: 'ai' },
            { id: 'def_2', name: 'Connaught Place - Monitored Commercial Hub', type: 'safe', lat: 28.6328, lng: 77.2197, radius: 2000, source: 'ai' },
            { id: 'def_3', name: 'Qutub Minar - Heritage Safety Zone', type: 'safe', lat: 28.5244, lng: 77.1855, radius: 1800, source: 'ai' },
            { id: 'def_4', name: 'Red Fort - Protected Tourist Corridor', type: 'safe', lat: 28.6562, lng: 77.2410, radius: 2200, source: 'ai' },
            { id: 'def_5', name: 'Tawang Monastery - Verified Safe Zone', type: 'safe', lat: 27.5875, lng: 91.8596, radius: 2000, source: 'manual' },
            { id: 'def_6', name: 'Sela Pass - High Altitude Hazard Alert', type: 'warning', lat: 27.4891, lng: 92.1032, radius: 2500, source: 'manual' },
            { id: 'def_7', name: 'Old Delhi - High Density Crowd Caution', type: 'warning', lat: 28.6505, lng: 77.2300, radius: 1500, source: 'ai' },
            { id: 'def_8', name: 'Yamuna Riverbank - Monsoon Flood Caution', type: 'danger', lat: 28.6700, lng: 77.2600, radius: 3000, source: 'ai' },
            { id: 'def_9', name: 'Jaipur Amer Fort - Monitored Heritage Area', type: 'safe', lat: 26.9855, lng: 75.8513, radius: 2500, source: 'ai' },
            { id: 'def_10', name: 'Mumbai Colaba Tourist District', type: 'safe', lat: 18.9220, lng: 72.8347, radius: 2200, source: 'ai' }
        ];
        const savedManual = JSON.parse(localStorage.getItem('travix_manual_zones') || '[]');
        return [...savedManual, ...baseZones];
    }

    // --- DATA MANAGEMENT ---
    async function fetchZones(lat = 28.6139, lng = 77.2090) {
        try {
            const response = await fetch(`${ZONES_API_BASE_URL}/api/v1/map-data?latitude=${lat}&longitude=${lng}&radius=50`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const manualZones = (data.manual_override_zones || []).map(zone => ({ ...zone, source: 'manual' }));
            const aiZones = data.ai_generated_zones || [];
            const savedManual = JSON.parse(localStorage.getItem('travix_manual_zones') || '[]');
            allZones = [...savedManual, ...manualZones, ...aiZones];
        } catch (error) {
            console.warn("Backend unavailable; using default safety zones:", error);
            allZones = getDefaultSafetyZones();
        }
        if (activePage === 'locations') {
            renderMap(allZones, 'locations');
            renderZoneList(allZones);
        }
        updateSafetyStats();
    }

    async function handleAddZone(e) {
        e.preventDefault();
        if (!newZoneCoords) return showNotification('error', 'Error', 'Please select a location on the map.');
        const newZone = {
            id: 'zone_' + Date.now(),
            name: document.getElementById('zone-name')?.value || 'New Custom Zone',
            type: document.getElementById('zone-type')?.value || 'safe',
            lat: newZoneCoords.lat,
            lng: newZoneCoords.lng,
            radius: 1500,
            source: 'manual'
        };

        try {
            const response = await fetch(`${ZONES_API_BASE_URL}/api/v1/zones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newZone),
            });
            if (response.ok) {
                const result = await response.json();
                if (result.zone?.id) newZone.id = result.zone.id;
            }
        } catch (error) {
            console.warn("Server unavailable; saved zone locally:", error);
        }

        const savedManual = JSON.parse(localStorage.getItem('travix_manual_zones') || '[]');
        savedManual.push(newZone);
        localStorage.setItem('travix_manual_zones', JSON.stringify(savedManual));

        allZones.push(newZone);
        renderMap(allZones, activePage);
        if (activePage === 'locations') renderZoneList(allZones);
        updateSafetyStats();
        setAddMode(false);
        showNotification('success', 'Zone Added', `Zone "${newZone.name}" has been registered.`);
    }

    async function handleRemoveZone(zoneId) {
        if (!confirm('Are you sure you want to remove this zone?')) return;
        try {
            await fetch(`${ZONES_API_BASE_URL}/api/v1/zones/${zoneId}`, { method: 'DELETE' });
        } catch (err) {
            console.warn("Server delete unavailable; removing locally:", err);
        }

        let savedManual = JSON.parse(localStorage.getItem('travix_manual_zones') || '[]');
        savedManual = savedManual.filter(z => String(z.id) !== String(zoneId));
        localStorage.setItem('travix_manual_zones', JSON.stringify(savedManual));

        allZones = allZones.filter(z => String(z.id) !== String(zoneId));
        renderMap(allZones, activePage);
        if (activePage === 'locations') renderZoneList(allZones);
        updateSafetyStats();
        showNotification('success', 'Zone Removed', 'Zone has been successfully deleted.');
    }

    // --- COLLECTIONS MANAGEMENT ---
    function loadCollections() {
        const stored = localStorage.getItem('travix_collections');
        if (stored) {
            try {
                allCollections = JSON.parse(stored);
            } catch (e) {
                allCollections = [];
            }
        }
        if (!allCollections || allCollections.length === 0) {
            allCollections = [
                { id: 'col_1', name: 'Delhi Heritage Tour', zoneIds: ['def_1', 'def_3', 'def_4'] },
                { id: 'col_2', name: 'Mountain Treks & Passes', zoneIds: ['def_5', 'def_6'] }
            ];
            localStorage.setItem('travix_collections', JSON.stringify(allCollections));
        }
    }

    function showAddToCollectionModal() {
        if (!addToCollectionModal || !collectionsDropdown) return;
        collectionsDropdown.innerHTML = '';
        allCollections.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.zoneIds.length} zones)`;
            collectionsDropdown.appendChild(opt);
        });
        addToCollectionModal.style.display = 'flex';
    }

    function handleAddToCollection(zoneId, collectionId) {
        const col = allCollections.find(c => c.id === collectionId);
        if (!col) return;
        if (!col.zoneIds.includes(zoneId)) {
            col.zoneIds.push(zoneId);
            localStorage.setItem('travix_collections', JSON.stringify(allCollections));
            showNotification('success', 'Added to Collection', `Zone added to "${col.name}"`);
        } else {
            showNotification('info', 'Already Present', `Zone already in "${col.name}"`);
        }
        if (addToCollectionModal) addToCollectionModal.style.display = 'none';
        if (activePage === 'collections') renderCollectionsPage();
    }

    function handleRemoveCollection(collectionId) {
        if (!confirm('Are you sure you want to delete this collection?')) return;
        allCollections = allCollections.filter(c => c.id !== collectionId);
        localStorage.setItem('travix_collections', JSON.stringify(allCollections));
        renderCollectionsPage();
        showNotification('success', 'Collection Deleted', 'Collection has been removed.');
    }

    function handleCreateCollection(e) {
        e.preventDefault();
        const input = document.getElementById('collection-name-input');
        if (!input || !input.value.trim()) return;
        const name = input.value.trim();
        const newCol = { id: 'col_' + Date.now(), name, zoneIds: [] };
        allCollections.push(newCol);
        localStorage.setItem('travix_collections', JSON.stringify(allCollections));
        input.value = '';
        renderCollectionsPage();
        showNotification('success', 'Collection Created', `Created collection "${name}"`);
    }

    // --- GEOLOCATION HELPER ---
    function getCurrentLocation(successCallback, errorCallback) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                successCallback,
                errorCallback || ((err) => {
                    console.warn("Geolocation warning:", err);
                    showNotification('warning', 'Location Warning', 'Unable to retrieve precise location.');
                }),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        } else {
            if (errorCallback) {
                errorCallback(new Error("Geolocation not supported"));
            } else {
                showNotification('error', 'Error', 'Geolocation is not supported by your browser.');
            }
        }
    }

    // --- USER LOCATION & MAP ---
    function trackAndShowMyLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    await fetchZones(latitude, longitude);
                    showUserMarker(latitude, longitude);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    showNotification('warning', 'Location Access', 'Unable to access your location.');
                }
            );
        } else {
            showNotification('error', 'Geolocation Not Supported', 'Your browser does not support this feature.');
        }
    }

    function showUserMarker(lat, lng) {
        if (!map) return;
        if (userMarker) map.removeLayer(userMarker);
        const userIcon = L.divIcon({ className: 'user-location-dot', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
        userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map).bindPopup('Your Current Location');
        map.flyTo([lat, lng], 15);
    }

    function calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    // --- UI & PAGE RENDERING ---
    function updateNavbar(user) {
        const userInfo = document.querySelector('.user-info');
        const userAvatar = document.getElementById('user-avatar');
        const collectionsNavItem = document.querySelector('.nav-item[data-page="collections"]');
        const loginNavBtn = document.getElementById('login-nav-btn');
        if (user) {
            if (userInfo) userInfo.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (loginNavBtn) loginNavBtn.style.display = 'none';
            if (userAvatar) userAvatar.textContent = (user.email || 'US').substring(0, 2).toUpperCase();
            if (collectionsNavItem) collectionsNavItem.style.display = (user.role === 'customer' || user.role === 'user') ? 'flex' : 'none';
        } else {
            if (userInfo) userInfo.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (loginNavBtn) loginNavBtn.style.display = 'block';
            if (collectionsNavItem) collectionsNavItem.style.display = 'none';
        }
    }

    function renderHomePage() {
        activePage = 'home';
        if (homeContent) homeContent.style.display = 'block';
        if (mapContainer) mapContainer.style.display = 'none';
        if (locationsSidebar) locationsSidebar.style.display = 'none';
        if (collectionsSidebar) collectionsSidebar.style.display = 'none';
        if (worldTravelSidebar) worldTravelSidebar.style.display = 'none';
        initializeHomePage();
    }

    function renderLocationsPage() {
        activePage = 'locations';
        if (homeContent) homeContent.style.display = 'none';
        if (mapContainer) mapContainer.style.display = 'block';
        document.querySelectorAll('#locations-sidebar .toggle-switch').forEach(toggle => {
            const zoneType = toggle.dataset.zoneType;
            if (zoneType && activeZoneTypes.hasOwnProperty(zoneType)) {
                toggle.classList.toggle('active', activeZoneTypes[zoneType]);
            }
        });
        renderMap(allZones, 'locations');
        renderZoneList(allZones);
        updateSafetyStats();
        if (locationsSidebar) locationsSidebar.style.display = 'flex';
        if (collectionsSidebar) collectionsSidebar.style.display = 'none';
        if (worldTravelSidebar) worldTravelSidebar.style.display = 'none';
        if (map) map.invalidateSize();
    }

    function renderCollectionsPage(zonesToDisplay = null) {
        activePage = 'collections';
        if (homeContent) homeContent.style.display = 'none';
        if (mapContainer) mapContainer.style.display = 'block';
        if (collectionListContainer) {
            collectionListContainer.innerHTML = '';
            allCollections.forEach(collection => {
                const listItem = document.createElement('div');
                listItem.className = 'collection-item';
                listItem.innerHTML = `<div class="collection-info" data-id="${collection.id}"><div class="collection-name">${collection.name}</div><div class="collection-count">${collection.zoneIds.length} zones</div></div><i class="fas fa-trash-alt remove-collection-btn" data-id="${collection.id}" title="Remove Collection"></i>`;
                collectionListContainer.appendChild(listItem);
            });
        }
        renderMap(zonesToDisplay === null ? allZones : zonesToDisplay, 'collections', zonesToDisplay !== null);
        if (locationsSidebar) locationsSidebar.style.display = 'none';
        if (collectionsSidebar) collectionsSidebar.style.display = 'flex';
        if (worldTravelSidebar) worldTravelSidebar.style.display = 'none';
        if (map) map.invalidateSize();
    }

    function renderWorldTravelPage() {
        activePage = 'world-travel';
        if (homeContent) homeContent.style.display = 'none';
        if (mapContainer) mapContainer.style.display = 'block';
        renderMap(allZones, 'world-travel');
        renderGlobalWarningList();
        if (locationsSidebar) locationsSidebar.style.display = 'none';
        if (collectionsSidebar) collectionsSidebar.style.display = 'none';
        if (worldTravelSidebar) worldTravelSidebar.style.display = 'flex';
        if (map) {
            map.invalidateSize();
            map.flyTo([20, 0], 2);
        }
    }

    function renderGlobalWarningList() {
        if (!globalWarningListContainer) return;
        globalWarningListContainer.innerHTML = '';
        const topCautionZones = allZones.filter(zone => zone.type === 'danger' || zone.type === 'warning');
        if (topCautionZones.length === 0) {
            globalWarningListContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9em;">No caution or restricted zones found.</p>';
            return;
        }
        topCautionZones.sort((a, b) => (a.type === 'danger' && b.type !== 'danger') ? -1 : (a.type !== 'danger' && b.type === 'danger') ? 1 : 0);
        topCautionZones.forEach(zone => {
            const listItem = document.createElement('div');
            listItem.className = 'zone-item';
            listItem.innerHTML = `<div class="zone-item-content" data-lat="${zone.lat}" data-lng="${zone.lng}"><div class="zone-indicator ${zone.type}"></div><div class="zone-info"><div class="zone-name">${zone.name}</div><div class="zone-count">${zone.type.charAt(0).toUpperCase() + zone.type.slice(1)} Zone</div></div></div>`;
            globalWarningListContainer.appendChild(listItem);
        });
    }

    function renderMap(zones, page, filter = false) {
        Object.values(zoneLayers).forEach(layer => layer.clearLayers());
        zones.forEach(zone => {
            if (page === 'world-travel' || filter || activeZoneTypes[zone.type]) {
                const zoneStyles = { safe: { color: 'var(--success)' }, warning: { color: 'var(--warning)' }, danger: { color: 'var(--danger)' } };
                const circle = L.circle([zone.lat, zone.lng], { color: zoneStyles[zone.type].color, fillColor: zoneStyles[zone.type].color, fillOpacity: zone.type === 'danger' ? 0.2 : 0.15, radius: zone.radius, weight: 2, dashArray: zone.type === 'danger' ? '5, 5' : null }).addTo(zoneLayers[zone.type]);
                let popupContent = `<b>${zone.name}</b><br>Status: ${zone.type}`;
                if (currentUser) {
                    if (currentUser.role === 'authority') popupContent += `<br><button class="remove-zone-popup-btn" data-id="${zone.id}">Remove Zone</button>`;
                    else if ((currentUser.role === 'customer' || currentUser.role === 'user') && page === 'locations') popupContent += `<br><button class="add-to-collection-popup-btn" data-id="${zone.id}">Add to Collection</button>`;
                }
                circle.bindPopup(popupContent);
            }
        });
    }

    function renderZoneList(zones) {
        if (!zoneListContainer) return;
        zoneListContainer.innerHTML = '';
        zones.forEach(zone => {
            const listItem = document.createElement('div');
            listItem.className = 'zone-item';
            listItem.innerHTML = `<div class="zone-item-content" data-lat="${zone.lat}" data-lng="${zone.lng}"><div class="zone-indicator ${zone.type}"></div><div class="zone-info"><div class="zone-name">${zone.name}</div><div class="zone-count">${zone.lat.toFixed(4)}, ${zone.lng.toFixed(4)}</div></div></div>${(currentUser && currentUser.role === 'authority') ? `<i class="fas fa-trash-alt remove-zone-btn" data-id="${zone.id}" title="Remove Zone"></i>` : ''}`;
            zoneListContainer.appendChild(listItem);
        });
    }

    function updateSafetyStats() {
        const totalLocationsStat = document.getElementById('total-locations-stat');
        const activeAlertsStat = document.getElementById('active-alerts-stat');
        if (totalLocationsStat) totalLocationsStat.textContent = allZones.length;
        if (activeAlertsStat) activeAlertsStat.textContent = allZones.filter(z => z.type === 'warning' || z.type === 'danger').length;
    }

    function setAddMode(enabled) {
        isAddMode = enabled;
        if (startAddZoneBtn) startAddZoneBtn.style.display = enabled ? 'none' : 'flex';
        if (addZoneForm) addZoneForm.style.display = enabled ? 'flex' : 'none';
        const mapElement = document.getElementById('map');
        if (mapElement) mapElement.classList.toggle('add-mode', enabled);
        map[enabled ? 'on' : 'off']('click', onMapClick);
        if (!enabled && tempMarker) {
            map.removeLayer(tempMarker); tempMarker = null;
            newZoneCoords = null;
            const coordsDisplay = document.getElementById('coords-display');
            if (coordsDisplay) coordsDisplay.textContent = 'Click on the map to set location';
            if (addZoneForm) addZoneForm.reset();
        }
    }

    function onMapClick(e) {
        newZoneCoords = e.latlng;
        const coordsDisplay = document.getElementById('coords-display');
        if (coordsDisplay) coordsDisplay.textContent = `Coords: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = L.marker(newZoneCoords).addTo(map);
    }
    
    // --- THEME & UI EFFECTS ---
    function setTheme(theme) {
        const lightTileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            if (tileLayer) tileLayer.setUrl(lightTileUrl);
        } else {
            document.body.classList.remove('light-mode');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            if (tileLayer) tileLayer.setUrl(darkTileUrl);
        }
        localStorage.setItem('theme', theme);
    }

    const words = ['Travix', 'ट्रैविक्स', 'ਟ੍ਰੈਵਿਕਸ', 'ત્રાવિક્સ', 'ట్రావిక్స్', 'ಟ್ರಾವಿಕ್ಸ್', 'ട്രാവിക്സ്', 'ত্রাভিক্স', 'ଟ୍ରାଭିକ୍ସ', 'त्राविक्स'];
    let wordIndex = 0, charIndex = 0, isDeleting = false;
    function typeWriter() {
        const typingElement = document.getElementById('typing-text');
        if (!typingElement) return;
        const currentWord = words[wordIndex];
        let typeSpeed;
        if (isDeleting) {
            typingElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 75;
        } else {
            typingElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 150;
        }
        if (!isDeleting && charIndex === currentWord.length) {
            typeSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typeSpeed = 1000;
        }
        setTimeout(typeWriter, typeSpeed * (0.8 + Math.random() * 0.4));
    }
    // --- NOTIFICATION SYSTEM ---
    function showNotification(type, title, message) {
        const container = document.getElementById('notification-container') || createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <i class="notification-icon fas ${getNotificationIcon(type)}"></i>
                <span class="notification-title">${title}</span>
            </div>
            <div class="notification-message">${message}</div>
        `;

        container.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    function createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    function getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    // --- EMERGENCY ALERT SYSTEM ---
    function showEmergencyAlert(message) {
        const modal = document.getElementById('emergency-modal') || createEmergencyModal();
        const messageElement = document.getElementById('emergency-message');
        
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        modal.style.display = 'flex';
    }

    function createEmergencyModal() {
        const modal = document.createElement('div');
        modal.id = 'emergency-modal';
        modal.className = 'modal emergency-modal';
        modal.innerHTML = `
            <div class="modal-content emergency-content">
                <div class="emergency-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Emergency Alert</h3>
                </div>
                <div class="emergency-body">
                    <p id="emergency-message">Emergency situation detected in your area.</p>
                    <div class="emergency-actions">
                        <button id="call-emergency-btn" class="btn btn-red">
                            <i class="fas fa-phone"></i>
                            Call Emergency Services
                        </button>
                        <button id="share-location-btn" class="btn btn-blue">
                            <i class="fas fa-map-marker-alt"></i>
                            Share Location
                        </button>
                        <button id="dismiss-emergency-btn" class="btn">Dismiss</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Setup event listeners with proper error handling
        const callBtn = modal.querySelector('#call-emergency-btn');
        const shareBtn = modal.querySelector('#share-location-btn');
        const dismissBtn = modal.querySelector('#dismiss-emergency-btn');

        if (callBtn) {
            callBtn.addEventListener('click', () => {
                try {
                    // Try multiple emergency numbers
                    const emergencyNumbers = ['tel:112', 'tel:911', 'tel:100']; // EU, US, India
                    window.open(emergencyNumbers[0]);
                    showNotification('info', 'Emergency Call', 'Opening emergency dialer...');
                } catch (error) {
                    console.error('Error opening emergency dialer:', error);
                    showNotification('error', 'Call Failed', 'Unable to open dialer. Please call emergency services manually.');
                }
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                try {
                    shareEmergencyLocation();
                } catch (error) {
                    console.error('Error sharing location:', error);
                    showNotification('error', 'Share Failed', 'Unable to share location. Please contact emergency services with your location manually.');
                }
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                try {
                    modal.style.display = 'none';
                    showNotification('info', 'Alert Dismissed', 'Emergency alert has been dismissed.');
                } catch (error) {
                    console.error('Error dismissing modal:', error);
                    modal.style.display = 'none';
                }
            });
        }

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        return modal;
    }

    // Enhanced location sharing function
    function shareEmergencyLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const locationUrl = `https://maps.google.com/?q=${lat},${lng}`;
                    
                    // Try native share API first
                    if (navigator.share) {
                        navigator.share({
                            title: 'Emergency Location - Travix',
                            text: 'I need emergency assistance at this location',
                            url: locationUrl
                        }).then(() => {
                            showNotification('success', 'Location Shared', 'Your emergency location has been shared successfully.');
                        }).catch((error) => {
                            console.error('Native share failed:', error);
                            fallbackLocationShare(locationUrl, lat, lng);
                        });
                    } else {
                        fallbackLocationShare(locationUrl, lat, lng);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    // Try to use stored user marker location as fallback
                    if (userMarker) {
                        const latlng = userMarker.getLatLng();
                        const locationUrl = `https://maps.google.com/?q=${latlng.lat},${latlng.lng}`;
                        fallbackLocationShare(locationUrl, latlng.lat, latlng.lng);
                    } else {
                        showNotification('error', 'Location Unavailable', 'Cannot access your location. Please share your location manually with emergency services.');
                    }
                }
            );
        } else {
            showNotification('error', 'Geolocation Not Supported', 'Your browser does not support location sharing.');
        }
    }

    // Fallback location sharing methods
    function fallbackLocationShare(locationUrl, lat, lng) {
        // Create a temporary text area to copy location
        const textArea = document.createElement('textarea');
        textArea.value = `Emergency Location: ${locationUrl}\nCoordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('success', 'Location Copied', 'Emergency location copied to clipboard. You can now paste it in messages.');
        } catch (error) {
            document.body.removeChild(textArea);
            // Last resort - open in new tab
            window.open(locationUrl, '_blank');
            showNotification('info', 'Location Opened', 'Your location has been opened in a new tab. Share this with emergency services.');
        }
    }

    

    // --- ENHANCED CAROUSEL FUNCTIONALITY ---
    function initializeCarousel() {
        const carouselImages = document.querySelectorAll('.carousel-image');
        
        // Preload all images simultaneously for faster loading
        const preloadPromises = [];
        
        carouselImages.forEach((img, index) => {
            const bgUrl = img.getAttribute('data-bg');
            if (bgUrl) {
                const preloadPromise = new Promise((resolve, reject) => {
                    const preloadImg = new Image();
                    preloadImg.onload = () => {
                        img.style.backgroundImage = `url(${bgUrl})`;
                        resolve();
                    };
                    preloadImg.onerror = () => {
                        console.error(`Failed to load image: ${bgUrl}`);
                        // Fallback to a default image or hide the slide
                        reject();
                    };
                    preloadImg.src = bgUrl;
                });
                preloadPromises.push(preloadPromise);
            }
        });

        // Wait for first image to load, then start carousel
        Promise.race(preloadPromises).then(() => {
            updateCarousel();
            setupCarouselControls();
            startCarouselAutoplay();
        });

        // Preload remaining images in background
        Promise.all(preloadPromises).then(() => {
            console.log('All carousel images loaded');
        });
    }

    function updateCarousel() {
        const carouselImages = document.querySelectorAll('.carousel-image');
        const indicators = document.querySelectorAll('.indicator');

        carouselImages.forEach((img, index) => {
            img.classList.remove('active');
            if (index === currentSlide) {
                img.classList.add('active');
            }
        });

        indicators.forEach((indicator, index) => {
            indicator.classList.remove('active');
            if (index === currentSlide) {
                indicator.classList.add('active');
            }
        });
    }

    function nextSlide() {
        const carouselImages = document.querySelectorAll('.carousel-image');
        currentSlide = (currentSlide + 1) % carouselImages.length;
        updateCarousel();
    }

    function prevSlide() {
        const carouselImages = document.querySelectorAll('.carousel-image');
        currentSlide = (currentSlide - 1 + carouselImages.length) % carouselImages.length;
        updateCarousel();
    }

    function goToSlide(slideIndex) {
        currentSlide = slideIndex;
        updateCarousel();
    }

    function setupCarouselControls() {
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        const indicators = document.querySelectorAll('.indicator');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                prevSlide();
                restartCarouselAutoplay();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                nextSlide();
                restartCarouselAutoplay();
            });
        }

        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                goToSlide(index);
                restartCarouselAutoplay();
            });
        });
    }

    function startCarouselAutoplay() {
        if (carouselInterval) clearInterval(carouselInterval);
        carouselInterval = setInterval(() => {
            nextSlide();
        }, 6000); // Change slide every 6 seconds
    }

    function restartCarouselAutoplay() {
        startCarouselAutoplay();
    }

     // --- CHATBOT FUNCTIONALITY ---
    function initializeChatbot() {
        const chatbotToggle = document.getElementById('chatbot-toggle');
        const chatbotWidget = document.getElementById('chatbot-widget');
        const chatbotClose = document.getElementById('chatbot-close');
        const chatbotSend = document.getElementById('chatbot-send');
        const chatbotInput = document.getElementById('chatbot-input-field');
        const chatbotMessages = document.getElementById('chatbot-messages');

        if (chatbotToggle) {
            chatbotToggle.addEventListener('click', () => {
                chatbotWidget.style.display = chatbotWidget.style.display === 'none' ? 'flex' : 'none';
            });
        }

        if (chatbotClose) {
            chatbotClose.addEventListener('click', () => {
                chatbotWidget.style.display = 'none';
            });
        }

        if (chatbotSend && chatbotInput) {
            chatbotSend.addEventListener('click', sendMessage);
            chatbotInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });
        }

        function sendMessage() {
            const message = chatbotInput.value.trim();
            if (!message) return;

            // Add user message
            addMessage(message, 'user');
            chatbotInput.value = '';

            // Simulate bot response
            setTimeout(() => {
                const response = generateBotResponse(message);
                addMessage(response, 'bot');
            }, 1000);
        }

        function addMessage(text, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}-message`;
            messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
            chatbotMessages.appendChild(messageDiv);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }

        function generateBotResponse(userMessage) {
            const responses = {
                'hello': 'Hello! How can I help you with your travel safety today?',
                'help': 'I can help you with zone information, safety alerts, and navigation. What do you need?',
                'zones': 'I can show you information about safe, caution, and restricted zones in your area.',
                'emergency': 'If you\'re in an emergency, please use the SOS button or call local emergency services immediately.',
                'location': 'I can help you track your location and find nearby safe zones.',
                'default': 'I\'m here to help with your travel safety. You can ask me about zones, locations, or safety information.'
            };

            const message = userMessage.toLowerCase();
            for (const [key, response] of Object.entries(responses)) {
                if (message.includes(key)) {
                    return response;
                }
            }
            return responses.default;
        }
    }

    // --- QUICK ACTIONS ---
    // Initialize quick action buttons with proper error handling
    function initializeQuickActions() {
    const quickEmergency = document.getElementById('quick-emergency');
    const quickShareLocation = document.getElementById('quick-share-location');
    const quickNearbyHelp = document.getElementById('quick-nearby-help');

    if (quickEmergency) {
        quickEmergency.addEventListener('click', () => {
            // Check if emergency alert function exists
            if (typeof showEmergencyAlert === 'function') {
                showEmergencyAlert('Emergency button pressed. Please confirm your situation.');
            } else {
                console.error('showEmergencyAlert function not defined');
                alert('Emergency services: Call 911 or your local emergency number');
            }
        });
    }

    if (quickShareLocation) {
        quickShareLocation.addEventListener('click', () => {
            // Check if location tracking function exists
            if (typeof trackAndShowMyLocation === 'function') {
                trackAndShowMyLocation();
                if (typeof showNotification === 'function') {
                    showNotification('info', 'Location Shared', 'Your location has been updated and shared.');
                }
            } else {
                // Fallback to basic geolocation
                getCurrentLocation((position) => {
                    console.log('Location:', position.coords);
                    if (typeof showNotification === 'function') {
                        showNotification('info', 'Location Shared', 'Your location has been captured.');
                    }
                });
            }
        });
    }

    if (quickNearbyHelp) {
        quickNearbyHelp.addEventListener('click', () => {
            findNearbyHelp();
        });
    }
    }

    // Fixed findNearbyHelp function with actual distance calculation
    function findNearbyHelp() {
        // Check if required variables exist
        if (typeof allZones === 'undefined' || !Array.isArray(allZones)) {
            console.error('allZones is not defined or not an array');
            if (typeof showNotification === 'function') {
                showNotification('error', 'Error', 'Zone data not available. Please refresh the page.');
            }
            return;
        }

        // Get user's current location first
        getCurrentLocation(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Filter safe zones
                const safeZones = allZones.filter(zone => zone.type === 'safe');
                
                if (safeZones.length === 0) {
                    if (typeof showNotification === 'function') {
                        showNotification('warning', 'No Help Found', 'No safe zones found. Contact emergency services if needed.');
                    } else {
                        alert('No safe zones found. Contact emergency services if needed.');
                    }
                    return;
                }
                
                // Calculate distances and find the nearest safe zone
                let nearestSafe = null;
                let minDistance = Infinity;
                
                safeZones.forEach(zone => {
                    // Ensure zone has valid coordinates
                    if (zone.lat && zone.lng) {
                        const distance = calculateDistance(userLat, userLng, zone.lat, zone.lng);
                        zone.distance = distance; // Add distance to zone object
                        
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestSafe = zone;
                        }
                    }
                });
                
                if (nearestSafe) {
                    // Check if map object exists before trying to use it
                    if (typeof map !== 'undefined' && map && typeof map.flyTo === 'function') {
                        map.flyTo([nearestSafe.lat, nearestSafe.lng], 15);
                    } else {
                        console.warn('Map object not available or flyTo method not found');
                    }
                    
                    // Format distance for display
                    const distanceText = minDistance < 1 
                        ? `${Math.round(minDistance * 1000)} meters` 
                        : `${minDistance.toFixed(1)} km`;
                    
                    if (typeof showNotification === 'function') {
                        showNotification('success', 'Nearest Safe Zone Found', 
                            `${nearestSafe.name} - ${distanceText} away`);
                    } else {
                        alert(`Nearest safe zone: ${nearestSafe.name} - ${distanceText} away`);
                    }
                    
                    // Optional: Display top 3 nearest safe zones
                    const topSafeZones = safeZones
                        .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
                        .slice(0, 3);
                    
                    console.log('Top 3 nearest safe zones:', topSafeZones);
                    
                } else {
                    if (typeof showNotification === 'function') {
                        showNotification('error', 'Error', 'Could not determine nearest safe zone.');
                    } else {
                        alert('Could not determine nearest safe zone.');
                    }
                }
            },
            (error) => {
                // Handle location error
                console.error('Location error:', error);
                
                // Fallback: Show all safe zones without distance calculation
                const safeZones = allZones.filter(zone => zone.type === 'safe');
                if (safeZones.length > 0) {
                    const firstSafe = safeZones[0];
                    
                    if (typeof map !== 'undefined' && map && typeof map.flyTo === 'function') {
                        map.flyTo([firstSafe.lat, firstSafe.lng], 15);
                    }
                    
                    if (typeof showNotification === 'function') {
                        showNotification('info', 'Safe Zone', 
                            `Showing ${firstSafe.name}. Enable location for nearest zone.`);
                    } else {
                        alert(`Showing ${firstSafe.name}. Enable location services for better results.`);
                    }
                } else {
                    if (typeof showNotification === 'function') {
                        showNotification('warning', 'Location Required', 
                            'Please enable location services to find nearby help.');
                    } else {
                        alert('Please enable location services to find nearby help.');
                    }
                }
            }
        );
    }


    // --- HOME PAGE SCRIPT ---
    function initializeHomePage() {
        initializeCarousel();
        initStatsCounters();
        initCTAButtons();
    }

    function animateCounter(element, target, duration = 2000) {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }

            let displayValue;
            if (target >= 1000) {
                displayValue = Math.floor(current).toLocaleString() + '+';
            } else {
                displayValue = Math.floor(current) + (target === 99 ? '%' : '+');
            }

            element.textContent = displayValue;
        }, 16);
    }

    function initStatsCounters() {
        const statItems = document.querySelectorAll('.stat-item');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const statNumber = entry.target.querySelector('.stat-number');
                    const targetValue = parseInt(entry.target.dataset.count);

                    setTimeout(() => {
                        animateCounter(statNumber, targetValue);
                    }, Math.random() * 500);

                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statItems.forEach((item) => observer.observe(item));
    }

    function initCTAButtons() {
        const exploreBtn = document.getElementById('explore-locations-btn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => {
                const locationsNav = document.querySelector('.nav-item[data-page="locations"]');
                if (locationsNav) locationsNav.click();
            });
        }
        const learnMoreBtn = document.getElementById('learn-more-btn');
        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', () => {
                const featuresSection = document.querySelector('.features-section');
                if (featuresSection) featuresSection.scrollIntoView({ behavior: 'smooth' });
            });
        }
        const getStartedBtn = document.getElementById('get-started-btn');
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', () => {
                const locationsNav = document.querySelector('.nav-item[data-page="locations"]');
                if (locationsNav) locationsNav.click();
            });
        }
    }


    // --- EVENT HANDLERS ---
    function setupMapEventListeners() {
        map.on('popupopen', function (e) {
            const popupNode = e.popup.getElement();
            const addToCollectionBtn = popupNode.querySelector('.add-to-collection-popup-btn');
            const removeZoneBtn = popupNode.querySelector('.remove-zone-popup-btn');

            if (addToCollectionBtn) {
                addToCollectionBtn.addEventListener('click', () => {
                    selectedZoneToAdd = allZones.find(z => z.id === addToCollectionBtn.dataset.id);
                    if (selectedZoneToAdd) showAddToCollectionModal();
                });
            }

            if (removeZoneBtn) {
                removeZoneBtn.addEventListener('click', () => {
                    handleRemoveZone(removeZoneBtn.dataset.id);
                });
            }
        });
    }

    function handleNavClick(e) {
        e.preventDefault();
        const page = e.currentTarget.dataset.page;
        if (page === activePage) return;
        navItems.forEach(item => item.classList.remove('active'));
        e.currentTarget.classList.add('active');

        if (page === 'home') renderHomePage();
        else if (page === 'locations') renderLocationsPage();
        else if (page === 'collections') renderCollectionsPage();
        else if (page === 'world-travel') renderWorldTravelPage();
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    navItems.forEach(item => item.addEventListener('click', handleNavClick));
    if (startAddZoneBtn) startAddZoneBtn.addEventListener('click', () => setAddMode(true));
    if (cancelAddZoneBtn) cancelAddZoneBtn.addEventListener('click', () => setAddMode(false));
    if (addZoneForm) addZoneForm.addEventListener('submit', handleAddZone);
    if (createCollectionForm) createCollectionForm.addEventListener('submit', handleCreateCollection);
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
             const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
             setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
    }

    // Quick demo logins
    document.getElementById('quick-user-btn')?.addEventListener('click', () => {
        document.getElementById('aadhaarNumber').value = '111122223333';
        document.getElementById('name').value = 'Rajesh Kumar';
        document.getElementById('dob').value = '1990-05-15';
        generateCaptcha();
        document.getElementById('captcha-input').value = captchaText;
        requestAuth();
    });

    document.getElementById('quick-auth-btn')?.addEventListener('click', () => {
        document.getElementById('aadhaarNumber').value = '333344445555';
        document.getElementById('name').value = 'Amit Singh';
        document.getElementById('dob').value = '2001-01-30';
        generateCaptcha();
        document.getElementById('captcha-input').value = captchaText;
        requestAuth();
    });

    document.getElementById('guest-login-btn')?.addEventListener('click', () => {
        loginAsUser('guest_001', 'Guest Traveler', 'user');
        showNotification('info', 'Guest Mode', 'Welcome! Browsing in guest mode.');
    });

    // Feature card click handlers
    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const feat = card.dataset.feature;
            if (feat === 'emergency') {
                window.location.href = 'emergency.html';
            } else if (feat === 'ai' || feat === 'locations') {
                const locTab = document.querySelector('.nav-item[data-page="locations"]');
                if (locTab) locTab.click();
            } else if (feat === 'global' || feat === 'world-travel') {
                const worldTab = document.querySelector('.nav-item[data-page="world-travel"]');
                if (worldTab) worldTab.click();
            } else if (feat === 'blockchain') {
                showNotification('info', 'Blockchain Verification', 'Audit logs are hashed and signed on the immutable ledger.');
            }
        });
    });

    // Emergency modal handlers
    const callEmergencyBtn = document.getElementById('call-emergency-btn');
    if (callEmergencyBtn) {
        callEmergencyBtn.addEventListener('click', () => {
            window.open('tel:112');
            showNotification('info', 'Emergency Dial', 'Dialing national emergency helpline 112...');
        });
    }
    const shareLocationBtn = document.getElementById('share-location-btn');
    if (shareLocationBtn) {
        shareLocationBtn.addEventListener('click', () => {
            shareEmergencyLocation();
        });
    }
    const dismissEmergencyBtn = document.getElementById('dismiss-emergency-btn');
    if (dismissEmergencyBtn) {
        dismissEmergencyBtn.addEventListener('click', () => {
            const modal = document.getElementById('emergency-modal');
            if (modal) modal.style.display = 'none';
        });
    }

    document.body.addEventListener('click', (e) => {
        if (currentUser && currentUser.role === 'authority' && e.target.matches('.remove-zone-btn')) {
            handleRemoveZone(e.target.dataset.id);
        }
        else if (e.target.matches('.close-btn')) {
            if (addToCollectionModal) addToCollectionModal.style.display = 'none';
        }
        else if (e.target.closest('.collection-info')) {
            const collectionId = e.target.closest('.collection-info').dataset.id;
            const collection = allCollections.find(c => c.id === collectionId);
            const zonesToDisplay = allZones.filter(z => collection.zoneIds.includes(z.id));
            renderCollectionsPage(zonesToDisplay);
        }
        else if (e.target.matches('.remove-collection-btn')) {
            e.stopPropagation();
            handleRemoveCollection(e.target.dataset.id);
        }
        else if (e.target.matches('#confirm-add-btn')) {
            const collectionId = collectionsDropdown?.value;
            if (selectedZoneToAdd && collectionId) {
                handleAddToCollection(selectedZoneToAdd.id, collectionId);
            }
        }
        
        const zoneItemContent = e.target.closest('.zone-item-content');
        if (zoneItemContent) {
            map.flyTo([zoneItemContent.dataset.lat, zoneItemContent.dataset.lng], 14);
        }

        const toggle = e.target.closest('.toggle-switch');
        if (toggle && activePage === 'locations') {
            const zoneType = toggle.dataset.zoneType;
            if (zoneType && activeZoneTypes.hasOwnProperty(zoneType)) {
                activeZoneTypes[zoneType] = !activeZoneTypes[zoneType];
                toggle.classList.toggle('active', activeZoneTypes[zoneType]);
                renderMap(allZones, 'locations');
            }
        }
    });


    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            if (activePage !== 'locations') return;
            const filteredZones = searchTerm === '' ? allZones : allZones.filter(zone => zone.name.toLowerCase().includes(searchTerm));
            renderMap(filteredZones, 'locations');
            renderZoneList(filteredZones);
        });
    }

    // --- FINAL INITIALIZATION ---
    generateCaptcha();
    setTheme(localStorage.getItem('theme') || 'dark');
    setTimeout(typeWriter, 1500);
    console.log('Travix Dashboard initialized and ready for Aadhaar login.');
});