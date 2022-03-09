# OpenWeatherMap app for Homey

This app allows you to poll the OpenWeatherMap API for localised weather data and use this in your Homey home automation flows. Several instances (locations) can run simultaneously. 
The app is providing the following devices:

## Current weather (oneCall API)

The 'current weather' data comes from the OWM current weather data. The new OneCall-API is used. Refer to https://openweathermap.org/api/one-call-api. This API can be used with the free API key subsciption.
It includes temperature, visibility, sunrise, sunset and some other data like descriptions and weather conditions.

## Hourly forecast (oneCall API)

The 'hourly forecast' displays the forecast data of the 'current weather' data. It's providing up to 48 hours forecast. 
Using '0' hours forecast gives the forecast of the current hour. A '5 hours' forecast gives forecast data 5 hours ahead.

## Daily forecast (oneCall API)

The 'daily forecast' displays the forecast data of the 'current weather' data. It's providing up to 7 days forecast.
Using '0' days forecast gives the forecast of the current day. A '3 day' forecast gives forecast data 3 days ahead.

## Deprecated devices
### Current weather (deprecated API)

The 'current weather' data comes from the OWM current weather data, refer to http://openweathermap.org/current. It includes visibility, sunrise and sunset data which are not included in the forecast tables. Note that the max. and min. temperatures in the current data indicate the possible range in which the actual temperature is expected, it can be seen as a measure for the standard deviation of the current temperature.

### Forecast up to 5 days (deprecated API)

The five day forecast data (refer to http://openweathermap.org/forecast5) includes forecasts in 3-hour intervals up to 5 days in the future. During pairing you can choose the 3-hour interval you want to have weather data from. Interval 1 gives you data from the currently running 3-hour interval (between one hour ago/two hours ahead) which should be close to the current weather. Interval 8 gives data 24 hours ahead, etc. In this dataset the maximum and minimum temperatures are the expected maximum and minimum temperature, as you would expect.

### Long term weather (deprecated API)

The long term weather forecast gives data for up to 16 days in the future, in daily intervals (refer to http://openweathermap.org/forecast16). Included in the data is the daily, morning, evening and night temperature.

# General information

The OpenWeatherMap polling is inspired by the 'openweather-apis', refer to https://github.com/CICCIOSGAMINO/openweather-apis. 

It was createy by Anne Baretta (https://github.com/abaretta/nu.baretta.openweathermap) and continued by Ronny Winkler (https://github.com/RonnyWinkler/homey.openweathermap).

Please use the forum for questions and comments related to the app: https://forum.athom.com/discussion/4225/.

## Pairing
Settings can be changed after pairing. By default Homey's location is used, optionally a different location can be entered (city name).

## Test the OWM API:

The API can be tested by querying the OpenWeathMap site directly. Enter your lan/lon-values and your API key into the URL:
`https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&exclude={part}&appid={API key}`
The lan/lon data can be found using the geocoding API. Insert your city and your API key into the URL:
`http://api.openweathermap.org/geo/1.0/direct?q={city name},{country code}&limit={limit}&appid={API key}`
See the API documentation for details:
`https://openweathermap.org/api/geocoding-api`

## Flow cards
For nearly all parameters trigger and condition cards are included.

## Requirements
To use the app, you need to get a (free) OpenWeatherMap API key at http://openweathermap.org. A single API key is sufficient for adding dozens of locations in the app.
The API key is limited for 1000 calls a day.
