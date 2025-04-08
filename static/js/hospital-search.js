// Simple hospital search functionality
function initHospitalSearch() {
    const map = new google.maps.Map(document.getElementById('hospitalMap'), {
        zoom: 13,
        center: { lat: -1.2921, lng: 36.8219 }, // Nairobi
        mapTypeControl: false,
        streetViewControl: false
    });

    const searchBox = new google.maps.places.SearchBox(
        document.getElementById('locationInput')
    );

    // Search when user clicks search button
    document.getElementById('searchBtn').addEventListener('click', () => {
        const places = searchBox.getPlaces();
        if (places && places.length > 0) {
            searchNearbyHospitals(map, places[0].geometry.location);
        }
    });

    // Use current location
    document.getElementById('useLocationBtn').addEventListener('click', () => {
        if (navigator.geolocation) {
            document.getElementById('searchSpinner').style.display = 'block';
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    searchNearbyHospitals(map, pos);
                },
                () => {
                    alert('Error getting your location. Please enter an address instead.');
                    document.getElementById('searchSpinner').style.display = 'none';
                }
            );
        } else {
            alert('Location services not supported by your browser');
        }
    });
}

function searchNearbyHospitals(map, location) {
    // Clear previous results
    document.getElementById('hospitalResults').innerHTML = '';
    
    // Show spinner
    document.getElementById('searchSpinner').style.display = 'block';

    // Center map
    map.setCenter(location);

    // Search for hospitals
    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
        location: location,
        radius: 5000,
        type: ['hospital']
    }, (results, status) => {
        document.getElementById('searchSpinner').style.display = 'none';
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            results.slice(0, 10).forEach(place => {
                // Create marker
                new google.maps.Marker({
                    map: map,
                    position: place.geometry.location,
                    title: place.name
                });

                // Add to list
                const item = document.createElement('div');
                item.className = 'list-group-item';
                item.innerHTML = `
                    <h5 class="mb-1">${place.name}</h5>
                    <p class="mb-1">${place.vicinity}</p>
                    <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.vicinity)}', '_blank')" 
                            class="btn btn-sm btn-primary">
                        Get Directions
                    </button>
                `;
                document.getElementById('hospitalResults').appendChild(item);
            });
        } else {
            document.getElementById('hospitalResults').innerHTML = 
                '<div class="alert alert-warning">No hospitals found nearby</div>';
        }
    });
}

// Initialize when the page loads
google.maps.event.addDomListener(window, 'load', initHospitalSearch);
