/* From Homey SDK 2.0 docs: The file device.js is a representation of an already paired device on Homey */
'use strict';

const Homey = require('homey');
const owm = require('../../lib/owm_api_deprecated.js');

class owmForecast extends Homey.Device {

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

        this._flowTriggerWindBeaufortChanged = this.homey.flow.getDeviceTriggerCard('WindBeaufortChanged');

        this._flowTriggerWindDirectionCompassChanged = this.homey.flow.getDeviceTriggerCard('WindDirectionCompassChanged');

        this._flowTriggerCloudinessChanged = this.homey.flow.getDeviceTriggerCard('CloudinessChanged');

        this._flowTriggerSnowChanged = this.homey.flow.getDeviceTriggerCard('SnowChanged');

        await this.updateCapabilities();

        // start polling
        this.pollWeatherHourly(settings);
    } // end onInit

    async updateCapabilities(){
        // add new capabilities
        if (!this.hasCapability('measure_temperature.min')){
            await this.addCapability('measure_temperature.min');
        }
        if (!this.hasCapability('measure_temperature.max')){
            await this.addCapability('measure_temperature.max');
        }
    }

    onAdded() {
        let id = this.getData().id;
        this.log('device added: ', id);
    } // end onAdded

    onDeleted() {
        let id = this.getData().id;
        clearInterval(this.pollingintervalHourly);
        this.log('device deleted:', id);
    } // end onDeleted

    async setDeviceUnavailable(message){
        this.setUnavailable(message);
    }

    async setDeviceAvailable(){
        if ( !this.getAvailable() ){
            await this.setAvailable();
        }
    }

    pollWeatherHourly(settings) {
        //run once, then at interval
        //this.log(typeof (this.pollingintervalHourly));

        let pollminutes = 10;

        this.pollingintervalHourly = owm.setIntervalImmediately(_ => {
            this.pollOpenWeatherMapHourly(settings)
        }, 60000 * pollminutes);
    }

    pollOpenWeatherMapHourly(settings) {

        owm.getURLHourly(settings).then(url => {
                return owm.getWeatherData(url);
            })
            .then(async data => {
                if (!data || !data.weather || data.cod != 200){
                    if (data.message && data.cod>200){
                        this.log("API error message!");
                        this.log(data);
                        this.setDeviceUnavailable(data.message);
                        return;
                    }
                    else{
                        this.log("No wether data found!");
                        this.setDeviceUnavailable(this.homey.__("device_unavailable_reason.no_api_result"));
                        return;
                    }
                }
                else{
                    this.setDeviceAvailable();
                }

                let device = this;
                let triggerList = [];
                let forecastInterval = this.getSetting('forecastInterval');
                this.log(device.getData().id +"Received OWM data");

                var GEOlocation = data.city.name + ", " + data.city.country;

                this.setSettings({
                        GEOlocation: GEOlocation,
                    })
                    .catch(this.error);

                var conditioncode = data.list[forecastInterval].weather[0].main;
                this.log("Main conditioncode: " + conditioncode);

                var conditioncode_detail = data.list[forecastInterval].weather[0].id;
                this.log("Specific conditioncode: " + data.list[forecastInterval].weather[0].id);

                var temp = data.list[forecastInterval].main.temp;
                var temp_min = data.list[forecastInterval].main.temp_min;
                var temp_max = data.list[forecastInterval].main.temp_max;
                var pressure = data.list[forecastInterval].main.pressure;
                var hum = data.list[forecastInterval].main.humidity;
                var cloudiness = data.list[forecastInterval].clouds.all;
                var description = data.list[forecastInterval].weather[0].description;

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
                        // Sometimes OWM returns an empty snow object
                        if (Object.keys(data.list[forecastInterval].snow).length == 0) {
                            var snow = 0;
                        }
                    }
                } else {
                    var snow = 0;
                }

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

                if (data.list[forecastInterval].wind.deg) {
                    var windangle = data.list[forecastInterval].wind.deg;
                    var winddegcompass = owm.degToCompass(windangle);
                    if (winddegcompass == undefined){
                        this.log("Could not get wind compass text for windangle: "+windangle);
                        winddegcompass = "";
                    }
                } else {
                    var windangle = null;
                    var winddegcompass = "";
                }

                if (data.list[forecastInterval].wind.speed) {
                    if (settings["units"] == "metric") {
                        // convert from m/s to km/h
                        var windstrength = Math.round(3.6 * data.list[forecastInterval].wind.speed);
                    } else {
                        // windspeed in mph
                        var windstrength = data.list[forecastInterval].wind.speed;
                    }
                } else {
                    var windstrength = {};
                }

                if (settings["units"] == "metric") {
                    // convert to beaufort and concatenate in a string with wind direction
                    var windspeedbeaufort = owm.beaufortFromKmh(windstrength);
                    var windcombined = owm.degToCompass(windangle) + " " + owm.beaufortFromKmh(windstrength)
                } else {
                    var windspeedbeaufort = owm.beaufortFromMph(windstrength);
                    var windcombined = owm.degToCompass(windangle) + " " + owm.beaufortFromMph(windstrength)
                }

                this.log("Comparing variables before and after current polling interval");

                if (this.getCapabilityValue('measure_windstrength_beaufort') != windspeedbeaufort) {
                    let state = {
                        "measure_windstrength_beaufort": windspeedbeaufort
                    };
                    let tokens = {
                        "measure_windstrength_beaufort": windspeedbeaufort,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWindBeaufortChanged, 'device':device, 'token':tokens, 'state':state});
                    //this._flowTriggerWindBeaufortChanged.trigger(device, tokens, state).catch(this.error)
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
                    //this._flowTriggerWindDirectionCompassChanged.trigger(device, tokens, state).catch(this.error)
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
                    //this._flowTriggerCloudinessChanged.trigger(device, tokens, state).catch(this.error)
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
                    //this._flowTriggerSnowChanged.trigger(device, tokens, state).catch(this.error)
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
                    //this._flowTriggerConditionChanged.trigger(device, tokens, state).catch(this.error)
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
                    //this._flowTriggerConditionDetailChanged.trigger(device, tokens, state).catch(this.error)
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
                    //this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
                }

                // update each interval, even if unchanged.

                const capabilitySet = {
                    'conditioncode': conditioncode,
                    'conditioncode_detail': conditioncode_detail,
                    'measure_temperature': temp,
                    'measure_temperature.max': temp_max,
                    'measure_temperature.min': temp_min,
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

                let capabilities = this.getCapabilities();
                for (let capability of capabilities) {
                            this.log("Capability: " + capability + ":" + capabilitySet[capability]);
                    if (capabilitySet[capability] != undefined) {
                        this.setCapabilityValue(capability, capabilitySet[capability]).catch(err => this.log(err.message));
                    } else {
                        this.log("Capability undefined: " + capability)
                    }
                };

                this.log("Trigger Flows...")
                for (let i=0; i<triggerList.length; i++){
                    triggerList[i].trigger.trigger(triggerList[i].device, triggerList[i].token, triggerList[i].state).catch(err => this.log(err.message));
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
            this.pollWeatherHourly(newSettings);
        } catch (error) {
            throw error;
        }
    }
}
module.exports = owmForecast;