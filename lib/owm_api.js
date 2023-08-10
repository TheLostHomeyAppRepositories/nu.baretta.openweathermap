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
    let beaufortKmhLimits = [1, 6, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117 ];
    // undefined for negative values...
    if (kmh < 0 || kmh == undefined) return undefined;

    let beaufortNum = beaufortKmhLimits.reduce(function (previousValue, currentValue, index, array) {
        return previousValue + (kmh > currentValue ? 1 : 0);
    }, 0);
    //return parseInt(beaufortNum);
    return beaufortNum;
}

function beaufortFromMph(mph) {
    let beaufortMphLimits = [1, 4, 8, 13, 19, 25, 32, 39, 47, 55, 64, 73, 111, 155, 208, 261, 320];
    // undefined for negative values...
    if (mph < 0 || mph == undefined) return undefined;

    let beaufortNum = beaufortMphLimits.reduce(function (previousValue, currentValue, index, array) {
        return previousValue + (mph > currentValue ? 1 : 0);
    }, 0);
    //return parseInt(beaufortNum);
    return beaufortNum;
}

function degToCompass(num) {
    while (num < 0) num += 360;
    while (num >= 360) num -= 360;
    let val = Math.round((num - 11.25) / 22.5);
    var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[Math.abs(val)];
}

// function getCoordinateURLCurrent(settings, callback) {
//     let cityAvailable = settings["GEOlocationCity"];
//     let ZipCodeAvailable = settings["GEOlocationZip"];
//     let coordinateQuery = null;
//     let forecastInterval = settings["forecastInterval"];
//     if (cityAvailable) {
//         coordinateQuery = 'q=' + encodeURI(settings["GEOlocationCity"]);
//     } else if (ZipCodeAvailable) {
//         coordinateQuery = 'zip=' + settings["GEOlocationZip"];
//     } else {
//         coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
//     }
//     let url = '/data/2.5/weather?' + coordinateQuery + '&units=' + settings['units'] + '&lang=' + settings['language'] + '&mode=json&APPID=' + settings["APIKey"];
//     return callback(null, url);
// };

// function getCoordinateURLHourly(settings, callback) {
//     let cityAvailable = settings["GEOlocationCity"];
//     let ZipCodeAvailable = settings["GEOlocationZip"];
//     let coordinateQuery = null;
//     if (cityAvailable) {
//         coordinateQuery = 'q=' + encodeURIComponent(settings["GEOlocationCity"]);
//     } else if (ZipCodeAvailable) {
//         coordinateQuery = 'zip=' + settings["GEOlocationZip"];
//     } else {
//         coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
//     }
//     let url = '/data/2.5/forecast?' + coordinateQuery + '&units=' + settings['units'] + '&lang=' + settings['language'] + '&mode=json&APPID=' + settings["APIKey"];
//     return callback(null, url);
// };

// function getCoordinateURLDaily(settings, callback) {
//     let cityAvailable = settings["GEOlocationCity"];
//     let ZipCodeAvailable = settings["GEOlocationZip"];
//     let coordinateQuery = null;
//     //let forecastInterval = settings["forecastInterval"];
//     if (cityAvailable) {
//         coordinateQuery = 'q=' + encodeURIComponent(settings["GEOlocationCity"]);
//     } else if (ZipCodeAvailable) {
//         coordinateQuery = 'zip=' + settings["GEOlocationZip"];
//     } else {
//         coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
//     }
//     let url = '/data/2.5/forecast/daily?' + coordinateQuery + '&units=' + settings['units'] + '&lang=' + settings['language'] + '&mode=json&APPID=' + settings["APIKey"] + '&cnt=16';
//     return callback(null, url);
// };

function getCurrentWeatherURL(settings) {
    // OncallAPI only supports lan/lot, no city geocoding
    let coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
    let url = '/data/2.5/weather?';
    url = url + coordinateQuery + '&units=' + settings['units'] + '&lang=' + settings['language'] + '&mode=json&APPID=' + settings["APIKey"];
    return url;
};

// function getOnecallURL(settings, callback) {
//     // OncallAPI only supports lan/lot, no city geocoding
//     // let cityAvailable = settings["GEOlocationCity"];
//     // let ZipCodeAvailable = settings["GEOlocationZip"];
//     let coordinateQuery = null;
//     //let forecastInterval = settings["forecastInterval"];
//     // if (cityAvailable) {
//     //     coordinateQuery = 'q=' + encodeURI(settings["GEOlocationCity"]);
//     // } else if (ZipCodeAvailable) {
//     //     coordinateQuery = 'zip=' + settings["GEOlocationZip"];
//     // } else {
//         coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
//     // }
//     let url = "";
//     switch (settings["APIVersion"]){
//         case "2.5":
//             url = '/data/2.5/onecall?';
//             break;
//         case "3.0":
//             url = '/data/3.0/onecall?';
//             break; 
//         default:
//             url = '/data/3.0/onecall?';
//             break;
//     }
//     url = url + coordinateQuery + '&units=' + settings['units'] + '&lang=' + settings['language'] + '&mode=json&APPID=' + settings["APIKey"];
//     return callback(null, url);
// };

// function getAirPollutionURL(settings, callback) {
//     // AirPollutionAPI only supports lan/lot, no city geocoding
//     let coordinateQuery = null;
//     coordinateQuery = 'lat=' + settings['lat'] + '&lon=' + settings['lon'];
//     let url = '/data/2.5/air_pollution/forecast?' + coordinateQuery + '&appid=' + settings["APIKey"];
//     return callback(null, url);
// };

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
    degToCompass,
    beaufortFromMph, 
    beaufortFromKmh 
};