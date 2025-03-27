$(document).ready(function() {
    const API_ENDPOINT = '/api';

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

    function showStationSuggestions($input, suggestions) {
        const $suggestionsBox = $input.siblings('.suggestions');
        $suggestionsBox.empty();

        if (suggestions.length === 0) {
            $suggestionsBox.hide();
            return;
        }

        suggestions.forEach(station => {
            $suggestionsBox.append(`
                <div class="suggestion-item" data-code="${station.code}">
                    ${station.title}
                </div>
            `);
        });

        $suggestionsBox.show();
    }

    $('.input-search').on('input', function () {
        const query = $(this).val().trim();
        const suggestions = searchLocalStations(query);
        showStationSuggestions($(this), suggestions);
    });

    $('#findRoute').on('click', async function () {
        const fromCode = $('#fromStation').data('station-code');
        const toCode = $('#toStation').data('station-code');

        if (!fromCode || !toCode) {
            alert('Выберите станции из списка предложений');
            return;
        }

        try {
            const response = await fetch(`${API_ENDPOINT}/searchRoutes?from=${fromCode}&to=${toCode}`);
            const data = await response.json();
            showRouteResults(data.routes);
        } catch (error) {
            console.error('Ошибка при поиске маршрута:', error);
            alert('Ошибка при загрузке маршрута');
        }
    });

    function showRouteResults(routes) {
        const $scheduleView = $('#scheduleView');
        $scheduleView.empty().show();

        if (!routes.length) {
            $scheduleView.append('<h3>Маршрутов не найдено</h3>');
            return;
        }

        $scheduleView.append('<h3>Список маршрутов<h3>');

        routes.forEach(route => {
            $scheduleView.append(`
                <div class="schedule-item">
                    <span>${route.thread.title}</span>
                    <span>${route.departure || '—'}</span>
                </div>
            `);
        });
    }

    $(document).on('click', '.suggestion-item', function(e) {
        e.stopPropagation();
        const $input = $(this).closest('.station-box').find('.input-search');
        $input.val($(this).text());
        $input.data('station-code', $(this).data('code'));
        $(this).parent().hide();
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('.station-box').length) {
            $('.suggestions').hide();
        }
    });

    initStations();
});
