/* From Homey SDK 2.0 docs: The file device.js is a representation of an already paired device on Homey */
'use strict';

const Homey = require('homey');
const weather = require('../../owm_api.js');

class owmLongterm extends Homey.Device {

    async onInit() {
        let name = this.getName() + '_' + this.getData().id;
        this.log('device init: '+name);

        let settings = this.getSettings();
        let forecastInterval = this.getSetting('forecastInterval') || 0;

        settings["lat"] = this.homey.geolocation.getLatitude();
        settings["lon"] = this.homey.geolocation.getLongitude();
        settings["units"] = this.homey.i18n.getUnits();
        settings["language"] = this.homey.i18n.getLanguage();
        settings["forecastInterval"] = forecastInterval;

        // updating settings object for settings dialogue
        this.setSettings({
                language: this.homey.i18n.getLanguage(),
                units: this.homey.i18n.getUnits(),
                lat: this.homey.geolocation.getLatitude(),
                lon: this.homey.geolocation.getLongitude(),
                forecastInterval: forecastInterval,
            })
            .catch(this.error)

        // Flows
        this._flowTriggerConditionChanged = this.homey.flow.getDeviceTriggerCard('ConditionChanged');

        this._flowTriggerConditionDetailChanged = this.homey.flow.getDeviceTriggerCard('ConditionDetailChanged');

        this._flowTriggerWeatherChanged = this.homey.flow.getDeviceTriggerCard('WeatherChanged');

        this._flowTriggerMinTempChanged = this.homey.flow.getDeviceTriggerCard('MintempChanged');

        this._flowTriggerMaxTempChanged = this.homey.flow.getDeviceTriggerCard('MaxtempChanged');

        this._flowTriggerMornTempChanged = this.homey.flow.getDeviceTriggerCard('MorntempChanged');

        this._flowTriggerEveTempChanged = this.homey.flow.getDeviceTriggerCard('EvetempChanged');

        this._flowTriggerNightTempChanged = this.homey.flow.getDeviceTriggerCard('NighttempChanged');

        this._flowTriggerWindBeaufortChanged = this.homey.flow.getDeviceTriggerCard('WindBeaufortChanged');

        this._flowTriggerWindDirectionCompassChanged = this.homey.flow.getDeviceTriggerCard('WindDirectionCompassChanged');

        this._flowTriggerCloudinessChanged = this.homey.flow.getDeviceTriggerCard('CloudinessChanged');

        this._flowTriggerSnowChanged = this.homey.flow.getDeviceTriggerCard('SnowChanged');

        // start polling
        this.pollWeatherDaily(settings);

    } // end onInit

    onAdded() {
        let id = this.getData().id;
        this.log('device added: ', id);

    } // end onAdded

    onDeleted() {

        let id = this.getData().id;
        clearInterval(this.pollingintervalDaily);
        this.log('device deleted:', id);

    } // end onDeleted

    pollWeatherDaily(settings) {
        //run once, then at interval
        let pollminutes = 15;

        this.pollingintervalDaily = weather.setIntervalImmediately(_ => {
            this.pollOpenWeatherMapDaily(settings)
        }, 60000 * pollminutes);
    }

    pollOpenWeatherMapDaily(settings) {

        weather.getURLDaily(settings).then(url => {
                return weather.getWeatherData(url);
            })
            .then(data => {
                let device = this;
                let triggerList = [];
                let forecastInterval = this.getSetting('forecastInterval');
                this.log(device.getData().id +" Received OWM data");

                let GEOlocation = data.city.name + ", " + data.city.country;

                this.setSettings({
                        GEOlocation: GEOlocation,
                    })
                    .catch(this.error);

                //var conditioncode = data.list[forecastInterval].weather[0].id;
                var conditioncode = data.list[forecastInterval].weather[0].main;
                this.log("Main condition: "+conditioncode);
 
                var conditioncode_detail = data.list[forecastInterval].weather[0].id;
                this.log("Specific conditioncode: " + data.list[forecastInterval].weather[0].id);

                var temp = data.list[forecastInterval].temp.day
                var temp_min = data.list[forecastInterval].temp.min
                var temp_max = data.list[forecastInterval].temp.max
                var temp_night = data.list[forecastInterval].temp.night
                var temp_eve = data.list[forecastInterval].temp.eve
                var temp_morn = data.list[forecastInterval].temp.morn
                var pressure = data.list[forecastInterval].pressure
                var hum = data.list[forecastInterval].humidity
                var cloudiness = data.list[forecastInterval].clouds
                this.log("cloudiness: "+ cloudiness);
                var description = data.list[forecastInterval].weather[0].description

                if (data.list[forecastInterval].rain != undefined) {
                    if (typeof (data.list[forecastInterval].rain) === "number") {
                        var rain = data.list[forecastInterval].rain
                    } else if (typeof (data.list[forecastInterval].rain) === "object") {
                        if (data.list[forecastInterval].rain['3h'] != undefined) {
                            var rain = data.list[forecastInterval].rain['3h'] / 3;
                        }
                        if (data.list[forecastInterval].rain['1h'] != undefined) {
                            var rain = data.list[forecastInterval].rain['1h'];
                        }
                        // Sometimes OWM returns an empty rain object
                        if (Object.keys(data.list[forecastInterval].rain).length == 0) {
                            var rain = 0;
                        }
                    }
                } else {
                    var rain = 0;
                }

                if (data.list[forecastInterval].snow != undefined) {
                    if (typeof (data.list[forecastInterval].snow) === "number") {
                        var snow = data.list[forecastInterval].snow
                    } else if (typeof (data.list[forecastInterval].snow) === "object") {
                        if (data.list[forecastInterval].snow['3h'] != undefined) {
                            var snow = data.list[forecastInterval].snow['3h'] / 3;
                        }
                        if (data.list[forecastInterval].snow['1h'] != undefined) {
                            var snow = data.list[forecastInterval].snow['1h'];
                        }
                        // Sometimes OWM returns an empty rain object
                        if (Object.keys(data.list[forecastInterval].snow).length == 0) {
                            var snow = 0;
                        }
                    }
                } else {
                    var snow = 0;
                }

                if (data.list[forecastInterval].deg) {
                    var windangle = data.list[forecastInterval].deg;
                } else {
                    var windangle = null;
                }

                if (data.list[forecastInterval].speed) {
                    var winddegcompass = weather.degToCompass(windangle);
                    if (settings["units"] == "metric") {
                        // convert from m/s to km/h
                        var windstrength = Math.round(3.6 * data.list[forecastInterval].speed);
                    } else {
                        // windspeed in mph
                        var windstrength = data.list[forecastInterval].speed;
                    }
                } else {
                    var windstrength = {};
                }

                if (settings["units"] == "metric") {
                    // convert to beaufort and concatenate in a string with wind direction
                    var windspeedbeaufort = weather.beaufortFromKmh(windstrength);
                    var windcombined = weather.degToCompass(windangle) + " " + weather.beaufortFromKmh(windstrength)
                } else {
                    var windspeedbeaufort = weather.beaufortFromMph(windstrength);
                    var windcombined = weather.degToCompass(windangle) + " " + weather.beaufortFromMph(windstrength)
                }

                this.log("Comparing variables before and after current polling interval");
                // update each interval, even if unchanged.


                if (this.getCapabilityValue('measure_temperature.min') != temp_min) {
                    this.log("temp_min has changed. Old min_temp: " + this.getCapabilityValue('measure_temperature.min') + " New min temp: " + temp_min);
                    let state = {
                        "measure_temperature.min": temp_min
                    };
                    let tokens = {
                        "measure_temperature.min": temp_min,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerMinTempChanged, 'device':device, 'token':tokens, 'state':state});
                    //this._flowTriggerMinTempChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('measure_temperature.max') != temp_max) {
                    this.log("temp_max has changed. Old max_temp: " + this.getCapabilityValue('measure_temperature.max') + " New max temp: " + temp_max);
                    let state = {
                        "measure_temperature.max": temp_max
                    };
                    let tokens = {
                        "measure_temperature.max": temp_max,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerMaxTempChanged, 'device':device, 'token':tokens, 'state':state});
                    //this._flowTriggerMaxTempChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('measure_temperature.morning') != temp_morn) {
                    let state = {
                        "measure_temperature.morning": temp_morn
                    };
                    let tokens = {
                        "measure_temperature.morning": temp_morn,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerMornTempChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerMornTempChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('measure_temperature.evening') != temp_eve) {
                    let state = {
                        "measure_temperature.evening": temp_eve
                    };
                    let tokens = {
                        "measure_temperature.evening": temp_eve,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerEveTempChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerEveTempChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('measure_temperature.night') != temp_night) {
                    let state = {
                        "measure_temperature.night": temp_night
                    };
                    let tokens = {
                        "measure_temperature.night": temp_night,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerNightTempChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerNightTempChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('measure_windstrength_beaufort') != windspeedbeaufort) {
                    let state = {
                        "measure_windstrength_beaufort": windspeedbeaufort
                    };
                    let tokens = {
                        "measure_windstrength_beaufort": windspeedbeaufort,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWindBeaufortChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWindBeaufortChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('measure_wind_direction_string') != winddegcompass) {
                    let state = {
                        "measure_wind_direction_string": winddegcompass
                    };
                    let tokens = {
                        "measure_wind_direction_string": winddegcompass,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWindDirectionCompassChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWindDirectionCompassChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('measure_snow') != snow) {
                    this.log("snow has changed. Previous snow: " + this.getCapabilityValue('measure_snow') + " New snow: " + snow);
                    let state = {
                        "measure_snow": snow
                    };
                    let tokens = {
                        "measure_snow": snow,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerSnowChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerSnowChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('measure_cloudiness') != cloudiness) {
                    this.log("cloudiness has changed. Previous cloudiness: " + this.getCapabilityValue('measure_cloudiness') + " New cloudiness: " + cloudiness);
                    let state = {
                        "measure_cloudiness": cloudiness
                    };
                    let tokens = {
                        "measure_cloudiness": cloudiness,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerCloudinessChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerCloudinessChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('conditioncode') != conditioncode) {
                    this.log("conditioncode has changed. Previous conditioncode: " + this.getCapabilityValue('conditioncode') + " New conditioncode: " + conditioncode);
                    let state = {
                        "conditioncode": conditioncode
                    };
                    let tokens = {
                        "conditioncode": conditioncode,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerConditionChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerConditionChanged.trigger(device, tokens).catch(this.error)
                }
                if (this.getCapabilityValue('conditioncode_detail') !== conditioncode_detail && conditioncode_detail !== undefined) {
                    this.log("Specific weatherconditioncode has changed. Previous conditioncode: " + this.getCapabilityValue('conditioncode_detail') + " New conditioncode: " + conditioncode_detail);
                    let state = {
                        "conditioncode": conditioncode_detail
                    };
                    let tokens = {
                        "conditioncode": conditioncode_detail,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerConditionDetailChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerConditionDetailChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('description') != description) {
                    this.log("description has changed. Previous description: " + this.getCapabilityValue('description') + " New description: " + description);
                    let state = {
                        "description": description
                    };
                    let tokens = {
                        "description": description,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWeatherChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWeatherChanged.trigger(device, tokens).catch(this.error)
                }

                // update each interval, even if unchanged.

                const capabilitySet = {
                    'conditioncode': conditioncode,
                    'conditioncode_detail': conditioncode_detail,
                    'measure_temperature': temp,
                    'measure_temperature.min': temp_min,
                    'measure_temperature.max': temp_max,
                    'measure_temperature.morning': temp_morn,
                    'measure_temperature.evening': temp_eve,
                    'measure_temperature.night': temp_night,
                    'measure_humidity': hum,
                    'measure_pressure': pressure,
                    'measure_rain': rain,
                    'measure_snow': snow,
                    'measure_wind_combined': windcombined,
                    'measure_wind_strength': windstrength,
                    'measure_wind_angle': windangle,
                    'measure_windstrength_beaufort': windspeedbeaufort,
                    'measure_wind_direction_string': winddegcompass,
                    'measure_cloudiness': cloudiness,
                    'description': description
                };

                this.getCapabilities().forEach(capability => {
                    this.log("Capability: " + capability + ":" + capabilitySet[capability]);
                    if (capabilitySet[capability] != undefined) {
                        this.setCapabilityValue(capability, capabilitySet[capability])
                            .catch(err => this.log(err));
                    } else {
                        this.log("Capability undefined: " + capability)
                    }
                });

                this.log("Trigger Flows...")
                for (let i=0; i<triggerList.length; i++){
                    triggerList[i].trigger.trigger(triggerList[i].device, triggerList[i].token, triggerList[i].state);
                }

            })
            .catch(error => {
                this.log(error);
            });
    }

    // parameters: {settings, newSettingsObj, changedKeysArr}
    onSettings(settings) {
        try {
            let newSettings = settings.oldSettings;
            for (let i = 0; i < settings.changedKeys.length; i++) {
                switch (settings.changedKeys[i]) {
                    case 'APIKey':
                        this.log('APIKey changed to ' + settings.newSettings.APIKey);
                        newSettings.APIKey = settings.newSettings.APIKey;
                        break;

                    case 'GEOlocationCity':
                        this.log('GEOlocationCity changed to ' + settings.newSettings.GEOlocationCity);
                        newSettings.GEOlocationCity = settings.newSettings.GEOlocationCity;
                        break;

                    case 'GEOlocationZip':
                        this.log('GEOlocationZip changed to ' + settings.newSettings.GEOlocationZip);
                        newSettings.GEOlocationZip = settings.newSettings.GEOlocationZip;
                        break;

                    case 'forecastInterval':
                        this.log('forecastInterval changed to ' + settings.newSettings.forecastInterval);
                        newSettings.forecastInterval = settings.newSettings.forecastInterval;
                        break;

                    default:
                        this.log("Key not matched: " + i);
                        break;
                }
            }
            clearInterval(this.pollingintervalcurrent);
            this.pollWeatherDaily(newSettings);
        } catch (error) {
            throw error;
        }
    }
}
module.exports = owmLongterm;