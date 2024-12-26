		let map;
        let panorama;
        let markers = [];
		
		const locationForm = document.getElementById('location-form');
        const itineraryList = document.getElementById('itinerary-list');
		const itinerarytext = document.getElementById('iti-text');
        const weatherSection = document.getElementById('weather-section');
        const weatherDetails = document.getElementById('weather-details');
        const streetViewSection = document.getElementById('street-view');

        function initializeApp() {
            console.log("Google Maps API initialized");
            map = new google.maps.Map(document.getElementById("map"), {
                zoom: 12,
                center: { lat: 51.5074, lng: -0.1278 } // Default to London
            });

            panorama = new google.maps.StreetViewPanorama(document.getElementById("street-view"), {
                pov: { heading: 165, pitch: 0 },
                zoom: 1
            });
            map.setStreetView(panorama);
        }

        function initializeMap(lat, lon) {
			map = new google.maps.Map(document.getElementById('map'), {
				center: { lat: lat, lng: lon },
				zoom: 12,
			});

			// Clear any existing markers
			const markerGroup = [];

			// Add a marker for the searched location
			const marker = new google.maps.Marker({
				position: { lat: lat, lng: lon },
				map: map,
				title: 'Searched Location',
			});

			// Set up click event on the marker to change the street view
			marker.addListener('click', () => {
				initializeStreetView(lat, lon);
			});

			markerGroup.push(marker); // Store the marker in the array
		}
		
		function initializeStreetView(lat, lng) {
			const location = { lat: lat, lng: lng };
			panorama = new google.maps.StreetViewPanorama(
				document.getElementById('street-view'), {
					position: location,
					pov: { heading: 165, pitch: 0 },
					zoom: 1
				}
			);
		}

		function showStreetView(lat, lng) {
			initializeStreetView(lat, lng);
		}

        function addMarkerToMap(lat, lon, name) {
			const marker = new google.maps.Marker({
				position: { lat: lat, lng: lon },
				map: map,
				title: name,
			});

			// Set up a click event on the marker to change the street view
			marker.addListener('click', () => {
				initializeStreetView(lat, lon);
			});
		}

        async function fetchPlaces(lat, lon, days) {
            return new Promise((resolve, reject) => {
                const service = new google.maps.places.PlacesService(map);
                const request = {
                    location: new google.maps.LatLng(lat, lon),
                    radius: '150000',
                    type: 'tourist_attraction'
                };

                service.nearbySearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        resolve(results.slice(0, days * 3));
                    } else {
                        console.error(`Google Places API error: ${status}`);
                        reject(new Error("Failed to fetch places from Google Places API."));
                    }
                });
            });
        }

        async function displayItinerary(places, weather, days) {
            itineraryList.innerHTML = '';
			weatherSection.style.display = 'none';
			
			itinerarytext.style.display = 'block';
			streetViewSection.style.display = 'block';

			if (weather) {
				const weatherDetailsText = `
						Weather: ${weather.weather[0].description}, 
						Temperature: ${weather.main.temp}°C, 
						Humidity: ${weather.main.humidity}%, 
						Wind Speed: ${weather.wind.speed} m/s, 
						Pressure: ${weather.main.pressure} hPa
					`;
					weatherDetails.textContent = weatherDetailsText;
					weatherSection.style.display = 'block'; // Show weather section
			}
            const maxPlacesPerDay = Math.ceil(places.length / days);
            const itineraryDays = [];

            for (let i = 0; i < days; i++) {
                itineraryDays.push(places.slice(i * maxPlacesPerDay, (i + 1) * maxPlacesPerDay));
            }

            itineraryDays.forEach((day, index) => {
                const dayHeader = document.createElement('li');
                dayHeader.classList.add('day');
                dayHeader.textContent = `Day ${index + 1}`;
                itineraryList.appendChild(dayHeader);

                day.forEach(place => {
                    const listItem = document.createElement('li');
                    listItem.textContent = place.name;
                    itineraryList.appendChild(listItem);
                    addMarkerToMap(place.geometry.location.lat(), place.geometry.location.lng(), place.name);
                });
            });
        }

        async function getCoordinates(location) {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=AIzaSyAj7k_Y-gdWz7DO9xnFspUwC66dugh1glk`);
            const data = await response.json();
            return data.results[0]?.geometry?.location;
        }
		
		async function fetchWeather(lat, lon) {
			const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=4fa37d75e829c675ef1910f359749e7d&units=metric`;
				const response = await fetch(weatherUrl);
				if (!response.ok) throw new Error('Failed to fetch weather data');
				return await response.json();
		}

        locationForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const location = document.getElementById('location').value;
			const days = parseInt(document.getElementById('days').value);
			itineraryList.innerHTML = '<li>Loading itinerary...</li>';

			try {
				const coords = await getCoordinates(location);
				if (coords) {
					// Show street view of the searched location by default
					showStreetView(coords.lat, coords.lng);
					initializeMap(coords.lat, coords.lng);
					const places = await fetchPlaces(coords.lat, coords.lng, days);
					const weather = await fetchWeather(coords.lat, coords.lng);
					displayItinerary(places, weather, days);
				} else {
					itineraryList.innerHTML = '<li>Location not found. Please try again.</li>';
				}
			} catch (error) {
				console.error('Error fetching itinerary:', error);
				itineraryList.innerHTML = '<li>Error fetching itinerary. Please try again later.</li>';
			}
		});