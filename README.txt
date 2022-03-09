This app brings the OpenWeatherMap API to Homey.
Get current weather data and forecasts for any number of locations.

The following weather data is available:
- Current weather data
- Hourly forecasts up to 48 hours
- Daily forecasts up to 7 days

Different values are provided for each variant, such as temperature, air pressure, humidity, weather conditions and many other values.

A description of the API and example data can be found at https://openweathermap.org/api/one-call-api

Precondition:
An API key is required to use the OpenWeatherMap API.
The API key can be downloaded free of charge from https://openweathermap.org/api.
1000 calls per day are permitted per API key.

Conversion to the OneCall API:
The previous Homey devices use an older API version that will no longer be supported by OWM in the future or is only available in subscriptions.
These devices are marked as [obsolete]. They still continue to work but they can't be added anomore.
As long as the API calls are still possible, these devices can continue to be used.
However, it is recommended to replace these devices with the new devices and adjust the flows.