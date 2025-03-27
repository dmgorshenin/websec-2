
$(document).ready(function() {
    const API_ENDPOINT = '/api';
    const $searchInput = $('#stationSearch');
    const $searchResults = $('#searchResults');
    const $scheduleView = $('#scheduleView');
    const $favoritesList = $('#favoritesList');
    const $searchButton = $('#searchButton');

    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    let map;
    let currentLocation = null;
    let allStations = [];

    async function initStations() {
        try {
            const response = await fetch(`${API_ENDPOINT}/allStations`);
            const data = await response.json();
            allStations = data.stations;
            console.log('Станции загружены:', allStations.length);
        } catch (error) {
            console.error('Ошибка загрузки станций:', error);
        }
    }

    function searchLocalStations(query) {
        const normalizedQuery = query.toLowerCase().trim();
        const finded = allStations.filter(station => 
            station.title.toLowerCase().includes(normalizedQuery) &&
            station.transport_type === 'train'
        );
        return finded 
    }

    function initYandexMap() {
        ymaps.ready(() => {
            initGeoLocation()
            let isDragging = false;
            let clickTimer; 

            map = new ymaps.Map('yandexMap', {
                center: [53.195878, 50.100202],
                zoom: 10
            });

            map.events.add('actionbegin', () => {
                isDragging = true;
            });

            map.events.add('actionend', () => {
                isDragging = false;
            });

            map.events.add('click', (e) => {
                clearTimeout(clickTimer);
                
                clickTimer = setTimeout(() => {
                    if (!isDragging) {
                        const coords = e.get('coords');
                        handleMapClick(coords);
                    }
                }, 50);
            });
        });
    }

    async function handleMapClick(coords) {
        await loadNearestStations(coords[0], coords[1]);
    }

    function initGeoLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    currentLocation = [
                        position.coords.latitude,
                        position.coords.longitude
                    ];
                    if (map) map.setCenter(currentLocation, 14);
                },
                error => {
                    console.error('Геолокация недоступна:', error);
                }
            );
        } else {
            alert('Геолокация не поддерживается браузером');
        }
    }

    async function loadNearestStations(lat, lng, distance = 50) {
        try {
            const response = await fetch(`${API_ENDPOINT}/nearestStations?lat=${lat}&lng=${lng}&distance=${distance}`);
            const data = await response.json();
            showNearestStations(data);
        } catch (error) {
            console.error('Ошибка загрузки станций:', error);
        }
    }

    function showNearestStations(data) {
        $searchResults.empty().show();
        
        if (!data?.stations?.length) {
            $searchResults.append('<div class="search-result-item-nofound">Станций поблизости не найдено</div>');
            return;
        }

        data.stations.forEach(station => {
            $searchResults.append(`
                <div class="search-result-item" data-code="${station.code}">
                    ${station.title} (${Math.round(station.distance)} км)
                </div>
            `);
        });
    }


    function renderFavorites() {
        $favoritesList.empty();
        if (favorites.length === 0) {
            $favoritesList.append('<div>Нет избранных станций</div>');
            return;
        }
        favorites.forEach(station => {
            $favoritesList.append(`
                <div class="favorite-item">
                    <span class="fav-station" data-code="${station.code}">
                        ${station.title}
                    </span>
                    <span class="remove-fav" data-code="${station.code}">❌</span>
                </div>
            `);
        });
    }

    function showSearchResults(stations) {
        $searchResults.empty().show();

        if (stations.length === 0) {
            $searchResults.append('<div class="search-result-item-nofound">Станций не найдено</div>');
            return;
        }

        stations.forEach(station => {
            $searchResults.append(`
                <div class="search-result-item" data-code="${station.code}">
                    ${station.title}
                </div>
            `);
        });
    }

    async function loadSchedule(titleStation, stationCode) {
        try {
            const response = await fetch(`${API_ENDPOINT}/schedule?station=${stationCode}`);
            const data = await response.json();
            showSchedule(titleStation, data);
        } catch (error) {
            console.error('Ошибка загрузки расписания:', error);
        }
    }

    function showSchedule(titleStation, data) {
        $scheduleView.empty();

        if (!data?.schedule || data.schedule.length === 0) {
            $scheduleView.append('<div>Нет данных по расписанию</div>');
            return;
        }
        $scheduleView.append(`<h3>Расписание электричек для станции ${titleStation}</h3>`);
        data.schedule.forEach(train => {
            $scheduleView.append(`
                <div class="schedule-item">
                    <span>${train.thread.title}</span>
                    <span>${train.departure || '—'}</span>
                </div>
            `);
        });
    }

    function handleDocumentClick(e) {
        const isSearchRelated = $(e.target).closest('.search-box, #searchResults').length > 0;
        if (!isSearchRelated) {
            $searchResults.hide();
        }
    }

    const mapScript = document.createElement('script');
    mapScript.src = 'https://api-maps.yandex.ru/2.1/?apikey=d70e58f2-79c2-4b10-8752-80181b717d58&lang=ru_RU';
    document.head.appendChild(mapScript);
    mapScript.onload = initYandexMap;

    $(document).on('click', handleDocumentClick);

    $searchButton.on('click', function() {
        const query = $searchInput.val().trim();
        if (query.length < 3) {
            alert('Введите минимум 3 символа');
            return;
        }
        
        const results = searchLocalStations(query);
        showSearchResults(results);
    });

    $searchInput.on('keypress', function(e) {
        if (e.which === 13) {
            $searchButton.click();
        }
    });

    $searchResults.on('click', '.search-result-item', function(e) {
        e.stopPropagation();
        const station = {
            title: $(this).text(),
            code: $(this).data('code')
        };

        loadSchedule(station.title, station.code);
        $searchResults.hide();

        if (!favorites.some(fav => fav.code === station.code)) {
            favorites.push(station);
            localStorage.setItem('favorites', JSON.stringify(favorites));
            renderFavorites();
        }
    });

    $favoritesList.on('click', '.fav-station', function() {
        const station = {
            title: $(this).text(),
            code: $(this).data('code')
        };
        loadSchedule(station.title, station.code);
    });

    $favoritesList.on('click', '.remove-fav', function(event) {
        event.stopPropagation();
        const stationCode = $(this).data('code');
        favorites = favorites.filter(fav => fav.code !== stationCode);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        renderFavorites();
    });

    initStations();
    renderFavorites();
});

