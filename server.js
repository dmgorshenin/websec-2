const express = require('express');
const axios = require('axios');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const YANDEX_API_KEY = process.env.YANDEX_API_KEY;

app.use(cors());
app.use(express.static('src'));

app.get('/api/allStations', async (req, res) => {

    try {
        const response = await axios.get('https://api.rasp.yandex.net/v3.0/stations_list/', {
            params: {
                apikey: YANDEX_API_KEY,
                format: 'json',
                lang: 'ru_RU'
            }
        });

        const processedData = processStationsData(response.data);
        res.json(processedData);
    } catch (error) {
        handleApiError(error, res);
    }
});

function processStationsData(data) {
    return {
        stations: data.countries?.flatMap(country => 
            country.regions?.flatMap(region => 
                region.settlements?.flatMap(settlement => 
                    settlement.stations?.map(station => ({
                        title: station.title,
                        code: station.codes.yandex_code,
                        lat: station.lat,
                        lng: station.lng,
                        transport_type: station.transport_type
                    }))
                )
            )
        ) || []
    };
}

app.get('/api/schedule', async (req, res) => {
    const station = req.query.station?.trim();
    if (!station) {
        return res.status(400).json({ error: 'Код станции обязателен' });
    }

    try {
        const response = await axios.get('https://api.rasp.yandex.net/v3.0/schedule', {
            params: {
                apikey: YANDEX_API_KEY,
                station: station,
                transport_types: 'train, suburban',
                lang: 'ru_RU',
                format: 'json'
            }
        });

        res.json(response.data);
    } catch (error) {
        handleApiError(error, res);
    }
});

app.get('/api/nearestStations', async (req, res) => {
    const { lat, lng , distance = 50 } = req.query;
    
    try {
        const response = await axios.get('https://api.rasp.yandex.net/v3.0/nearest_stations/', {
            params: {
                apikey: YANDEX_API_KEY,
                lat: lat,
                lng: lng,
                distance: distance,
                transport_type: 'train, suburban',
                lang: 'ru_RU',
                format: 'json'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        handleApiError(error, res);
    }
});

app.get('/api/searchRoutes', async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Оба поля, от и до, обязательны.' });

    try {
        const response = await axios.get('https://api.rasp.yandex.net/v3.0/search/', {
            params: {
                apikey: YANDEX_API_KEY,
                from: from,
                to: to,
                transport_types: 'train, suburban',
                lang: 'ru_RU'
            }
        });

        const routes = response.data.segments;
        res.json({ routes });
    } catch (error) {
        console.error('Ошибка при поиске маршрутов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

function handleApiError(error, res) {
    if (error.response) {
        console.error('Ошибка API:', error.response.data);
        res.status(error.response.status).json({ error: error.response.data.message || 'Ошибка API' });
    } else if (error.request) {
        console.error('Нет ответа от API:', error.request);
        res.status(503).json({ error: 'Сервис временно недоступен' });
    } else {
        console.error('Ошибка сервера:', error.message);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
