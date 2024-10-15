document.addEventListener("DOMContentLoaded", function () {
    const mapContainer = document.getElementById('map');
    const liveLocationBox = document.getElementById('live-location');
    const speedLimitBox = document.getElementById('speed-limit');
    const currentSpeedBox = document.getElementById('current-speed');  // Current speed element

    let previousPosition = null;  // To store previous position for speed calculation
    let speedLimit = 0;  // To store the speed limit

    if (mapContainer) {
        const map = L.map('map').setView([52.5, 13.4], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Function to calculate distance using Haversine formula
        function haversineDistance(lat1, lon1, lat2, lon2) {
            const R = 6371e3; // Earth’s radius in meters
            const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            const distance = R * c; // in meters
            return distance;
        }

        // Function to calculate speed in km/h
        function calculateSpeed(previousPosition, currentPosition, timeDiff) {
            const distance = haversineDistance(
                previousPosition.coords.latitude,
                previousPosition.coords.longitude,
                currentPosition.coords.latitude,
                currentPosition.coords.longitude
            );

            // Convert time difference from milliseconds to hours
            const timeDiffHours = timeDiff / (1000 * 60 * 60);

            // Speed = distance (km) / time (hours)
            const speed = (distance / 1000) / timeDiffHours;

            return speed;
        }

        // Function to update the map with the user's current position
        function updateMapPosition(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
                .then(response => response.json())
                .then(data => {
                    const locationName = data.display_name;
                    if (liveLocationBox) {
                        liveLocationBox.textContent = locationName;
                    }
                })
                .catch(error => console.error('Error with reverse geocoding:', error));

            // Fetch speed limit using Overpass API
            fetchSpeedLimit(lat, lng);

            map.setView([lat, lng], 15);

            if (window.userMarker) {
                map.removeLayer(window.userMarker);
            }

            window.userMarker = L.marker([lat, lng]).addTo(map).bindPopup('You are here!').openPopup();

            // Calculate current speed
            if (previousPosition) {
                const timeDiff = position.timestamp - previousPosition.timestamp; // Time difference in ms
                const speed = calculateSpeed(previousPosition, position, timeDiff);

                if (currentSpeedBox) {
                    currentSpeedBox.textContent = speed.toFixed(2) + ' km/h';

                    // Change border color based on speed limit comparison
                    if (speed > speedLimit) {
                        currentSpeedBox.style.border = "5px solid red";  // Red if speed exceeds limit
                    } else {
                        currentSpeedBox.style.border = "5px solid green";  // Green if within limit
                    }
                }
            }

            previousPosition = position;  // Store current position for next calculation
        }

        // Fetch speed limit from Overpass API
        function fetchSpeedLimit(lat, lng) {
            const overpassQuery = `
                [out:json];
                way(around:50,${lat},${lng})["maxspeed"];
                out body;
            `;
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

            fetch(overpassUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.elements && data.elements.length > 0) {
                        speedLimit = data.elements[0].tags.maxspeed;
                        if (speedLimitBox) {
                            speedLimitBox.textContent = speedLimit + ' km/h';
                        }
                    } else {
                        console.log('No speed limit found');
                        speedLimit = 50;  // Default speed limit if none found
                    }
                })
                .catch(error => console.error('Error fetching speed limit:', error));
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                updateMapPosition,
                error => console.error("Error getting location: ", error),
                { enableHighAccuracy: true, timeout: 10000 }
            );

            navigator.geolocation.watchPosition(
                updateMapPosition,
                error => console.error("Error tracking location: ", error),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    } else {
        console.error("Map container not found");
    }
});











function navigateToNearby(serviceType) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;
            window.location.href = `nearby?service=${serviceType}&lat=${currentLat}&lng=${currentLng}`;
        }, function(error) {
            console.error("Error fetching location: ", error);
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
}
