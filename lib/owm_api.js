// weather.js - APIs for openweathermap.org

const config = {
    units: 'metric',
    lan: 'en',
    format: 'json',
    APPID: null
};

// main settings
const http = require('http.min');
const options = {
    protocol: 'https:',
    hostname: 'api.openweathermap.org',
    path: '/data/2.5/weather?q=fairplay',
    headers: {
        'User-Agent': 'Node.js http.min'
    }
};

function beaufortFromKmh(kmh) {
    let beaufortKmhLimits = [0, 1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118, 134, 150, 167, 184, 203];
    // undefined for negative values...
    let beaufortNum = 0;
    if (kmh < 0 || kmh == undefined) return beaufortNum;
    for (let i=0; i<beaufortKmhLimits.length; i++){
        if (kmh >= beaufortKmhLimits[i]){
            beaufortNum = i;
        }
    }
    return beaufortNum;
}

function beaufortFromMph(mph) {
    let beaufortMphLimits = [0, 1, 4, 7, 12, 18, 24, 31, 39, 47, 55, 64, 73, 83, 93, 104, 114, 126]
    let beaufortNum = 0;
    if (mph < 0 || mph == undefined) return beaufortNum;
    for (let i=0; i<beaufortMphLimits.length; i++){
        if (mph >= beaufortMphLimits[i]){
            beaufortNum = i;
        }
    }
}

function degToCompass(num) {
    while (num < 0) num += 360;
    while (num >= 360) num -= 360;
    let val = Math.round((num - 11.25) / 22.5);
    var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[Math.abs(val)];
}

function getCurrentWeatherURL(settings) {
    // OncallAPI only supports lan/lot, no city geocoding
    let coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
    let url = '/data/2.5/weather?';
    url = url + coordinateQuery + '&units=' + settings['units'] + '&lang=' + settings['language'] + '&mode=json&APPID=' + settings["APIKey"];
    return url;
};

function getOnecallURL(settings) {
    // OncallAPI only supports lan/lot, no city geocoding
    let coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
    let url = "";
    switch (settings["APIVersion"]){
        case "2.5":
            url = '/data/2.5/onecall?';
            break;
        case "3.0":
            url = '/data/3.0/onecall?';
            break; 
        default:
            url = '/data/3.0/onecall?';
            break;
    }
    url = url + coordinateQuery + '&units=' + settings['units'] + '&lang=' + settings['language'] + '&mode=json&APPID=' + settings["APIKey"];
    return url;
};

function getOnecallDailySummaryURL(settings,tz) {
    // OncallAPI only supports lan/lot, no city geocoding
    let currentDate = new Date().toLocaleString('en-US', 
    { 
        hour12: false, 
        timeZone: tz,
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
    targetDate = new Date(currentDate);
    targetDate.setDate(targetDate.getDate() + settings.days);

    date = targetDate.toLocaleString('en-US', 
    { 
        hour12: false, 
        // timeZone: tz,
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
    date = date.split('/')[2]+'-'+date.split('/')[0]+'-'+date.split('/')[1];

    // compute date based on offset
    let coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
    let url = '/data/3.0/onecall/day_summary?';
    url = url + coordinateQuery + '&units=' + settings['units'] + '&lang=' + settings['language'] + '&mode=json&APPID=' + settings["APIKey"];
    url = url + '&date=' + date;
    return url;
};

function getAirPollutionURL(settings) {
    // AirPollutionAPI only supports lan/lot, no city geocoding
    let coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
    let url = '/data/2.5/air_pollution/forecast?' + coordinateQuery + '&appid=' + settings["APIKey"];
    return url;
};

function getGeocodeURL(settings) {
    return '/geo/1.0/direct?q=' + encodeURIComponent(settings["GEOlocationCity"]) + '&limit=5' + '&APPID=' + settings["APIKey"];
};

async function getWeatherData(url) {
    options.path = url;
    return await http.json(options)
}

module.exports = { 
    getWeatherData, 
    getGeocodeURL, 
    getCurrentWeatherURL,
    getOnecallURL,
    getOnecallDailySummaryURL,
    getAirPollutionURL,
    degToCompass,
    beaufortFromMph, 
    beaufortFromKmh 
};