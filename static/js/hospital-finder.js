// Global variables
let map = null;
let markers = [];
let currentLocation = null;
let searchInProgress = false;

// Initialize the map
async function initMap() {
    console.log('Initializing map...');
    try {
        // Default center (will be updated with user's location)
        const defaultCenter = { lat: 0, lng: 0 };
        
        // Create the map instance
        const mapElement = document.getElementById('hospitalMap');
        if (!mapElement) {
            console.error('Hospital map element not found');
            return;
        }

        const { Map } = await google.maps.importLibrary("maps");
        map = new Map(mapElement, {
            zoom: 14,
            center: defaultCenter,
            mapTypeControl: false,
            fullscreenControl: true,
            streetViewControl: false
        });

        console.log('Map initialized successfully');

        // Initialize event listeners
        initializeEventListeners();
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Initialize map when modal opens
    const hospitalModal = document.getElementById('hospitalModal');
    if (hospitalModal) {
        hospitalModal.addEventListener('shown.bs.modal', function () {
            console.log('Modal opened, resizing map...');
            if (map) {
                google.maps.event.trigger(map, 'resize');
                if (!markers.length) {
                    console.log('No markers found, getting user location...');
                    useCurrentLocation();
                }
            }
        });
    }

    // Add form submit handler
    const searchForm = document.getElementById('hospitalSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (searchInProgress) return;
            const locationInput = document.getElementById('locationInput');
            if (locationInput && locationInput.value.trim()) {
                console.log('Searching for location:', locationInput.value);
                searchHospitals(locationInput.value);
            }
        });
    }

    // Add location button handler
    const useLocationBtn = document.getElementById('useLocationBtn');
    if (useLocationBtn) {
        useLocationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (searchInProgress) return;
            console.log('Use location button clicked');
            useCurrentLocation();
        });
    }
}

// Use current location
function useCurrentLocation() {
    if (!map) {
        console.error('Map not initialized');
        return;
    }

    if (searchInProgress) {
        console.log('Search already in progress');
        return;
    }

    searchInProgress = true;
    document.getElementById('searchSpinner').style.display = 'block';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Got user position');
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                currentLocation = new google.maps.LatLng(pos.lat, pos.lng);
                searchHospitals(null, pos);
            },
            (error) => {
                console.error('Geolocation error:', error);
                document.getElementById('searchSpinner').style.display = 'none';
                searchInProgress = false;
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        alert('Location permission denied. Please enable location services or enter an address.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert('Location information is unavailable. Please enter an address.');
                        break;
                    case error.TIMEOUT:
                        alert('Location request timed out. Please try again or enter an address.');
                        break;
                    default:
                        alert('Error getting your location. Please enter an address instead.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        searchInProgress = false;
        alert('Geolocation is not supported by your browser. Please enter your location manually.');
    }
}

// Search for hospitals
function searchHospitals(address, coordinates) {
    console.log('searchHospitals called with:', { address, coordinates });
    if (!map) {
        console.error('Map not initialized');
        return;
    }

    clearMarkers();
    document.getElementById('searchSpinner').style.display = 'block';
    document.getElementById('hospitalResults').style.display = 'none';
    
    if (address) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address }, (results, status) => {
            console.log('Geocoding results:', { status, results });
            if (status === 'OK' && results[0]) {
                currentLocation = results[0].geometry.location;
                searchNearbyHospitals(currentLocation);
            } else {
                document.getElementById('searchSpinner').style.display = 'none';
                searchInProgress = false;
                alert('Could not find that location. Please try again.');
            }
        });
    } else if (coordinates) {
        currentLocation = new google.maps.LatLng(coordinates.lat, coordinates.lng);
        searchNearbyHospitals(currentLocation);
    }
}

// Search for nearby hospitals
async function searchNearbyHospitals(location) {
    console.log('searchNearbyHospitals called with location:', location);
    if (!map) {
        console.error('Map not initialized');
        document.getElementById('searchSpinner').style.display = 'none';
        searchInProgress = false;
        return;
    }

    map.setCenter(location);
    
    try {
        const { PlacesService } = await google.maps.importLibrary("places");
        const service = new PlacesService(map);

        const request = {
            location: location,
            radius: 5000,
            type: ['hospital', 'health']
        };

        service.nearbySearch(request, (results, status) => {
            console.log('Places API response:', { status, results });
            document.getElementById('searchSpinner').style.display = 'none';
            document.getElementById('hospitalResults').style.display = 'block';
            searchInProgress = false;

            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                clearMarkers();
                const resultsDiv = document.getElementById('hospitalResults');
                resultsDiv.innerHTML = '';

                if (results.length === 0) {
                    resultsDiv.innerHTML = '<p class="text-center">No hospitals found in this area.</p>';
                    return;
                }

                results.forEach(place => {
                    createMarker(place);
                    addToResultsList(place);
                });

                // Fit map bounds to show all markers
                const bounds = new google.maps.LatLngBounds();
                markers.forEach(marker => bounds.extend(marker.getPosition()));
                bounds.extend(location); // Include search location
                map.fitBounds(bounds);
            } else {
                console.error('Places search failed:', status);
                const resultsDiv = document.getElementById('hospitalResults');
                resultsDiv.innerHTML = `
                    <div class="alert alert-info">
                        <p class="mb-0">No hospitals found in this area. Try:</p>
                        <ul class="mb-0">
                            <li>Expanding your search radius</li>
                            <li>Checking a different location</li>
                            <li>Using a more general search term</li>
                        </ul>
                    </div>`;
            }
        });
    } catch (error) {
        console.error('Error searching for hospitals:', error);
        document.getElementById('searchSpinner').style.display = 'none';
        searchInProgress = false;
        alert('Error searching for hospitals. Please try again.');
    }
}

// Create a marker for a hospital
function createMarker(place) {
    const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        title: place.name,
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/hospitals.png',
            scaledSize: new google.maps.Size(32, 32)
        }
    });

    marker.addListener('click', () => {
        const content = `
            <div class="info-window">
                <h5>${place.name}</h5>
                <p>${place.formatted_address}</p>
                ${place.rating ? `
                    <p>
                        Rating: ${place.rating} 
                        (${place.user_ratings_total} reviews)
                    </p>
                ` : ''}
                ${place.opening_hours?.isOpen() ? 
                    '<p class="text-success">Open now</p>' : 
                    '<p class="text-danger">Closed</p>'}
                <button class="btn btn-sm btn-primary mt-2" onclick="getDirections('${place.place_id}')">
                    Get Directions
                </button>
            </div>
        `;
        
        const infowindow = new google.maps.InfoWindow({
            content: content,
            ariaLabel: place.name,
        });
        
        infowindow.open({
            anchor: marker,
            map,
        });
    });

    markers.push(marker);
}

// Add hospital to results list
function addToResultsList(place) {
    const hospitalList = document.getElementById('hospitalList');
    if (!hospitalList) return;

    const distance = calculateDistance(place.geometry.location);
    
    const item = document.createElement('div');
    item.className = 'list-group-item';
    item.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${place.name}</h6>
            <small>${distance} km</small>
        </div>
        <p class="mb-1">${place.formatted_address}</p>
        <div class="d-flex justify-content-between align-items-center">
            <small>${place.rating ? `Rating: ${place.rating} (${place.user_ratings_total} reviews)` : 'No ratings'}</small>
            <button class="btn btn-sm btn-primary" onclick="getDirections('${place.place_id}')">
                Get Directions
            </button>
        </div>
    `;
    
    hospitalList.appendChild(item);
}

// Calculate distance between two points
function calculateDistance(location) {
    if (!currentLocation || !location) return 0;
    return (google.maps.geometry.spherical.computeDistanceBetween(currentLocation, location) / 1000).toFixed(1);
}

// Clear all markers from the map
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// Get directions to hospital
function getDirections(destination) {
    if (!currentLocation) return;
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat()},${currentLocation.lng()}&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank');
}

// Initialize map when the API loads
window.initMap = initMap;
