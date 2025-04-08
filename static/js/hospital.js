let map;
let service;
let infowindow;
let markers = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing hospital functionality...');

    // Get modal elements
    const hospitalModal = document.getElementById('hospitalModal');
    const searchBtn = document.getElementById('searchBtn');
    const useLocationBtn = document.getElementById('useLocationBtn');
    const locationInput = document.getElementById('locationInput');
    const searchSpinner = document.getElementById('searchSpinner');
    const hospitalResults = document.getElementById('hospitalResults');
    const hospitalError = document.getElementById('hospitalError');

    // Initialize map immediately
    initializeMap();

    // Handle search button click
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const address = locationInput ? locationInput.value.trim() : '';
            if (address) {
                searchByAddress(address);
            } else {
                if (hospitalError) {
                    hospitalError.textContent = 'Please enter a location';
                    hospitalError.style.display = 'block';
                }
            }
        });
    }

    // Handle location input enter key
    if (locationInput) {
        locationInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }

    // Handle "Use My Location" button click
    if (useLocationBtn) {
        useLocationBtn.addEventListener('click', function() {
            if (navigator.geolocation) {
                if (searchSpinner) searchSpinner.style.display = 'block';
                if (hospitalResults) hospitalResults.style.display = 'none';
                if (hospitalError) hospitalError.style.display = 'none';
                
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        const location = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        searchNearbyHospitals(location);
                    },
                    function(error) {
                        console.error('Geolocation error:', error);
                        if (searchSpinner) searchSpinner.style.display = 'none';
                        if (hospitalError) {
                            hospitalError.textContent = 'Unable to get your location. Please enable location services or enter location manually.';
                            hospitalError.style.display = 'block';
                        }
                    }
                );
            } else {
                if (hospitalError) {
                    hospitalError.textContent = 'Location services not supported by your browser';
                    hospitalError.style.display = 'block';
                }
            }
        });
    }
});

function initializeMap(center = { lat: -1.2921, lng: 36.8219 }) {
    try {
        const mapElement = document.getElementById('hospitalMap');
        if (!mapElement) return;

        // Initialize map
        map = new google.maps.Map(mapElement, {
            center: center,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
        });

        // Create info window
        infowindow = new google.maps.InfoWindow();

        // Create places service
        service = new google.maps.places.PlacesService(map);

    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

function searchByAddress(address) {
    const searchSpinner = document.getElementById('searchSpinner');
    const hospitalResults = document.getElementById('hospitalResults');
    const hospitalError = document.getElementById('hospitalError');

    if (searchSpinner) searchSpinner.style.display = 'block';
    if (hospitalResults) hospitalResults.style.display = 'none';
    if (hospitalError) hospitalError.style.display = 'none';

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: address }, function(results, status) {
        if (status === 'OK' && results && results.length > 0) {
            const location = results[0].geometry.location;
            searchNearbyHospitals(location);
        } else {
            if (searchSpinner) searchSpinner.style.display = 'none';
            if (hospitalError) {
                hospitalError.textContent = 'Could not find location. Please try again.';
                hospitalError.style.display = 'block';
            }
        }
    });
}

function searchNearbyHospitals(location) {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // Center map on location
    map.setCenter(location);
    map.setZoom(13);

    // Add marker for user location
    const locationMarker = new google.maps.Marker({
        position: location,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF'
        },
        title: 'Your Location'
    });
    markers.push(locationMarker);

    // Search for hospitals
    const request = {
        location: location,
        radius: 5000,
        type: ['hospital']
    };

    service.nearbySearch(request, function(results, status) {
        const searchSpinner = document.getElementById('searchSpinner');
        const hospitalResults = document.getElementById('hospitalResults');
        const hospitalError = document.getElementById('hospitalError');

        if (searchSpinner) searchSpinner.style.display = 'none';

        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            if (hospitalResults) {
                hospitalResults.innerHTML = '';
                hospitalResults.style.display = 'block';
            }

            // Limit to closest 10 hospitals
            const nearestHospitals = results.slice(0, 10);

            nearestHospitals.forEach(place => {
                // Create marker
                const marker = new google.maps.Marker({
                    position: place.geometry.location,
                    map: map,
                    title: place.name
                });
                markers.push(marker);

                // Add click listener to marker
                marker.addListener('click', () => {
                    const content = `
                        <div style="padding: 8px;">
                            <h3 style="margin: 0 0 4px 0; font-size: 14px;">${place.name}</h3>
                            <p style="margin: 4px 0; font-size: 12px;">Rating: ${place.rating ? place.rating + '/5' : 'N/A'}</p>
                            <p style="margin: 4px 0; font-size: 12px;">${place.vicinity}</p>
                            <button onclick="getDirections('${place.vicinity}')" 
                                    style="margin-top: 4px;" 
                                    class="btn btn-sm btn-primary">
                                Get Directions
                            </button>
                        </div>
                    `;
                    if (infowindow) infowindow.close();
                    infowindow.setContent(content);
                    infowindow.open(map, marker);
                });

                // Add to results list
                if (hospitalResults) {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'list-group-item';
                    resultItem.innerHTML = `
                        <h5 class="mb-1">${place.name}</h5>
                        <p class="mb-1">Rating: ${place.rating ? place.rating + '/5' : 'N/A'}</p>
                        <p class="mb-1">${place.vicinity}</p>
                        <button onclick="getDirections('${place.vicinity}')" 
                                class="btn btn-sm btn-primary">
                            Get Directions
                        </button>
                    `;
                    resultItem.addEventListener('click', () => {
                        google.maps.event.trigger(marker, 'click');
                        map.panTo(marker.getPosition());
                    });
                    hospitalResults.appendChild(resultItem);
                }
            });
        } else {
            if (hospitalError) {
                hospitalError.textContent = 'Could not find hospitals in this area. Please try another location.';
                hospitalError.style.display = 'block';
            }
        }
    });
}

function getDirections(destination) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`, '_blank');
}
