'use strict';

const { throws } = require('assert');
const Homey = require('homey');
const weather = require('../../owm_api.js');
const intervalCurrent = 5;

class owmCurrenWeather extends Homey.Device {

    async onInit() {
        let name = this.getName() + '_' + this.getData().id;
        this.log('CurrentWeather init: '+name);

        await this.updateCapabilities();

        let settings = await this.getSettings();
        if (!settings.pollingInterval || settings.pollingInterval == 0){
            settings.pollingInterval = intervalCurrent;
            this.setSettings(settings);
        }

        // settings["lat"] = this.homey.geolocation.getLatitude();
        // settings["lon"] = this.homey.geolocation.getLongitude();
        settings["units"] = this.homey.i18n.getUnits();
        settings["language"] = this.homey.i18n.getLanguage();

        // updating settings object for settings dialogue
        // this.setSettings({
        //         language: this.homey.i18n.getLanguage(),
        //         units: this.homey.i18n.getUnits(),
        //         lat: this.homey.geolocation.getLatitude(),
        //         lon: this.homey.geolocation.getLongitude(),
        //     })
        //     .catch(this.error)

        // Flows
        this._flowTriggerTemperatureChanged = this.homey.flow.getDeviceTriggerCard('TemperatureChanged');
        this._flowTriggerTemperatureFeelslikeChanged = this.homey.flow.getDeviceTriggerCard('TemperatureFeelslikeChanged');
        this._flowTriggerTemperatureMinChanged = this.homey.flow.getDeviceTriggerCard('TemperatureMinChanged');
        this._flowTriggerTemperatureMaxChanged = this.homey.flow.getDeviceTriggerCard('TemperatureMaxChanged');

        this._flowTriggerConditionChanged = this.homey.flow.getDeviceTriggerCard('ConditionChanged');
        this._flowTriggerConditionDetailChanged = this.homey.flow.getDeviceTriggerCard('ConditionDetailChanged');
        this._flowTriggerWeatherChanged = this.homey.flow.getDeviceTriggerCard('WeatherChanged');

        this._flowTriggerWindBeaufortChanged = this.homey.flow.getDeviceTriggerCard('WindBeaufortChanged');
        this._flowTriggerWindDirectionCompassChanged = this.homey.flow.getDeviceTriggerCard('WindDirectionCompassChanged');
        this._flowTriggerWindCombinedChanged = this.homey.flow.getDeviceTriggerCard('WindCombinedChanged');
        this._flowTriggerWindStrengthChanged = this.homey.flow.getDeviceTriggerCard('WindStrengthChanged');
        this._flowTriggerWindAngleChanged = this.homey.flow.getDeviceTriggerCard('WindAngleChanged');

        this._flowTriggerHumidityChanged = this.homey.flow.getDeviceTriggerCard('HumidityChanged');
        this._flowTriggerPressureChanged = this.homey.flow.getDeviceTriggerCard('PressureChanged');

        this._flowTriggerCloudinessChanged = this.homey.flow.getDeviceTriggerCard('CloudinessChanged');
        this._flowTriggerVisibilityChanged = this.homey.flow.getDeviceTriggerCard('VisibilityChanged');

        this._flowTriggerRainChanged = this.homey.flow.getDeviceTriggerCard('RainChanged');
        this._flowTriggerSnowChanged = this.homey.flow.getDeviceTriggerCard('SnowChanged');

        this._flowTriggerSunriseChanged = this.homey.flow.getDeviceTriggerCard('SunriseChanged');
        this._flowTriggerSunsetChanged = this.homey.flow.getDeviceTriggerCard('SunsetChanged');

        //run once to get the first data
        if (settings.pollingActive == true){
            this.pollWeatherCurrent(settings);
        }
    } // end onInit

    async updateCapabilities(){
        // add new capabilities
        // if (!this.hasCapability('measure_temperature_feelslike')){
        //     await this.addCapability('measure_temperature_feelslike');
        // }
    }

    onAdded() {
        let id = this.getData().id;
        this.log('device added: ', id);

    } // end onAdded

    onDeleted() {

        let id = this.getData().id;
        clearInterval(this.pollingintervalcurrent);
        this.log('device deleted:', id);
    } // end onDeleted

    pollWeatherCurrent(settings) {
        //run once, then at interval

        this.pollingintervalcurrent = weather.setIntervalImmediately(_ => {
                this.pollOpenWeatherMapCurrent(settings)
            }, 60 * 1000 * settings.pollingInterval);
    }

    async setDeviceUnavailable(message){
        this.setUnavailable(message);
    }

    async setDeviceAvailable(){
        if ( !this.getAvailable() ){
            await this.setAvailable();
        }
    }

    async updateDevice(){
        // Flow action for single update
        let settings = await this.getSettings();
        let newsettings = {};
        newsettings['lat'] = settings['lat'];
        newsettings['lon'] = settings['lon'];
        newsettings["APIKey"] = settings["APIKey"];
        newsettings["units"] = this.homey.i18n.getUnits();
        newsettings["language"] = this.homey.i18n.getLanguage();
        this.pollOpenWeatherMapCurrent(newsettings);
    }

    async pollOpenWeatherMapCurrent(settings) {

        weather.getURLCurrentWeather(settings).then(url => {
                //this.log("OnCall-URL: "+url);
                return weather.getWeatherData(url);
            })
            .then(async (data) => {
                // this.log("Result:");
                // this.log(data);
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
                this.log(device.getData().id +" Received OWM data");

                //var GEOlocation = "Lat:" + data.lat + " Lon:" +data.lon;
                var GEOlocation = this.getName();
                // this.setSettings({
                //         GEOlocation: GEOlocation,
                //     })
                //     .catch(this.error);
                let tz  = this.homey.clock.getTimezone();

                var conditioncode = data.weather[0].main;
                this.log("Main conditioncode: " + data.weather[0].main);
                var conditioncodeText = this.homey.app.getConditioncodeText(conditioncode);

                var conditioncode_detail = data.weather[0].id.toString();
                var conditioncode_detail_number = data.weather[0].id;
                this.log("Specific conditioncode: " + data.weather[0].id);

                let forecast_time;
                let lastUpdate;
                let hasDateLocalization = this.homey.app.hasDateLocalization();
                if (hasDateLocalization){
                    let now = new Date(data.dt*1000).toLocaleString(this.homey.i18n.getLanguage(), 
                    { 
                        hour12: false, 
                        timeZone: tz,
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    });
                    forecast_time = now.replace(',', '');

                    now = new Date().toLocaleString(this.homey.i18n.getLanguage(), 
                    { 
                        hour12: false, 
                        timeZone: tz,
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    });
                    lastUpdate = 'Last update: ' + now.replace(',', '');
                }
                else{
                    let now = new Date(data.dt*1000).toLocaleString('en-US', 
                        { 
                            hour12: false, 
                            timeZone: tz,
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                        });
                    let date = now.split(", ")[0];
                    date = date.split("/")[2] + "-" + date.split("/")[0] + "-" + date.split("/")[1]; 
                    let time = now.split(", ")[1];
                    forecast_time = date + " " + time;

                    now = new Date().toLocaleString('en-US', 
                    { 
                        hour12: false, 
                        timeZone: tz,
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    });
                    date = now.split(", ")[0];
                    date = date.split("/")[2] + "-" + date.split("/")[0] + "-" + date.split("/")[1]; 
                    time = now.split(", ")[1];
                    lastUpdate = 'Last update: ' + date + " " + time;
                    }

                this.setSettings({
                    "APIState": lastUpdate
                    })
                    .catch(this.error);
                    
                var temp = Math.round(data.main.temp * 10) / 10;
                var temp_feelslike = Math.round(data.main.feels_like* 10) / 10;
                var temp_min = Math.round(data.main.temp_min * 10) / 10;
                var temp_max = Math.round(data.main.temp_max * 10) / 10;
                var hum = data.main.humidity;
                var pressure = data.main.pressure;

                if (data.snow != undefined) {
                    if (typeof (data.snow) === "number") {
                        var snow = data.snow
                    } else if (typeof (data.snow) === "object") {
                        if (data.snow['3h'] != undefined) {
                            var snow = data.snow['3h'] / 3;
                        }
                        if (data.snow['1h'] != undefined) {
                            var snow = data.snow['1h'];
                        }
                        // Sometimes OWM returns an empty snow object
                        if (Object.keys(data.snow).length == 0) {
                            var snow = 0;
                        }
                    }
                } else {
                    var snow = 0;
                }

                if (data.rain != undefined) {
                    if (typeof (data.rain) === "number") {
                        var rain = data.rain
                    } else if (typeof (data.rain) === "object") {
                        if (data.rain['3h'] != undefined) {
                            var rain = data.rain['3h'] / 3;
                        }
                        if (data.rain['1h'] != undefined) {
                            var rain = data.rain['1h'];
                        }
                        // Sometimes OWM returns an empty rain object
                        if (Object.keys(data.rain).length == 0) {
                            var rain = 0;
                        }
                    }
                } else {
                    var rain = 0;
                }

                if (data.wind.speed) {
                    if ( this.getSetting('windspeed_ms') == true){
                        if (settings["units"] == "metric") {
                            var windstrength = data.wind.speed;
                        } else {
                            // mph to m/s
                            var windstrength = Math.round(data.wind.speed / 2.237);
                        }
                    }
                    else{
                        if (settings["units"] == "metric") {
                            // convert from m/s to km/h
                            var windstrength = Math.round(3.6 * data.wind.speed);
                        } else {
                            // windspeed in mph
                            var windstrength = data.wind.speed;
                        }
                    }
                } else {
                    var windstrength = 0;
                }

                if (data.wind.deg) {
                    var windangle = data.wind.deg;
                    var winddegcompass = weather.degToCompass(windangle);
                } else {
                    var windangle = 0;
                    var winddegcompass = "";
                }
                if (settings["units"] == "metric") {
                    // convert to beaufort and concatenate in a string with wind direction
                    var windspeedbeaufort = weather.beaufortFromKmh(windstrength);
                } else {
                    var windspeedbeaufort = weather.beaufortFromMph(windstrength);
                }
                if (winddegcompass != ""){
                    var windcombined =  this.homey.__("windDirectionIcon."+winddegcompass) + 
                                        " " + 
                                        this.homey.__("windDirectionShort."+winddegcompass) + 
                                        " " +
                                        windspeedbeaufort.toString();
                }
                else{
                    var windcombined = windspeedbeaufort.toString();
                }
                var cloudiness = data.clouds.all;
                var visibility = data.visibility;
                var description = data.weather[0].description;

                // var sunr = new Date(data.sunrise * 1e3);
                // var sunrise = sunr.getHours() + ":" + (sunr.getMinutes() < 10 ? '0' : '') + sunr.getMinutes();
                let sunr = new Date(data.sys.sunrise*1000).toLocaleString('en-US', 
                { 
                    hour12: false, 
                    timeZone: tz,
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                });
                let sunrise = sunr.split(", ")[1];

                // var suns = new Date(data.sunset * 1e3);
                // var sunset = suns.getHours() + ":" + (suns.getMinutes() < 10 ? '0' : '') + suns.getMinutes();
                let suns = new Date(data.sys.sunset*1000).toLocaleString('en-US', 
                { 
                    hour12: false, 
                    timeZone: tz,
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                });
                let sunset = suns.split(", ")[1];

                this.log("Comparing variables before and after current polling interval");

                if (this.getCapabilityValue('measure_temperature') !== temp && temp !== undefined) {
                    this.log("Temp. previous: " + this.getCapabilityValue('measure_temperature') );
                    this.log("Temp. new: " + temp );
                    let state = {
                        "measure_temperature": temp
                    };
                    let tokens = {
                        "measure_temperature": temp,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerTemperatureChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerTemperatureChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_temperature_feelslike') !== temp_feelslike && temp_feelslike !== undefined) {
                    this.log("Temp.FeelsLike previous: " + this.getCapabilityValue('measure_temperature_feelslike') );
                    this.log("Temp.FeelsLike new: " + temp_feelslike );
                    let state = {
                        "measure_temperature_feelslike": temp_feelslike
                    };
                    let tokens = {
                        "measure_temperature_feelslike": temp_feelslike,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerTemperatureFeelslikeChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerTemperatureFeelslikeChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_temperature_min') !== temp_min && temp_min !== undefined) {
                    this.log("Temp Min. previous: " + this.getCapabilityValue('measure_temperature_min') );
                    this.log("Temp Min. new: " + temp_min );
                    let state = {
                        "measure_temperature_min": temp_min
                    };
                    let tokens = {
                        "measure_temperature_min": temp_min,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerTemperatureMinChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerTemperatureChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_temperature_max') !== temp_max && temp_max !== undefined) {
                    this.log("Temp Max. previous: " + this.getCapabilityValue('measure_temperature_max') );
                    this.log("Temp Max. new: " + temp_max );
                    let state = {
                        "measure_temperature_max": temp_max
                    };
                    let tokens = {
                        "measure_temperature_max": temp_max,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerTemperatureMaxChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerTemperatureChanged.trigger(device, tokens, state).catch(this.error)
                }
                        if (this.getCapabilityValue('measure_cloudiness') !== cloudiness && cloudiness !== undefined) {
                    this.log("Cloudiness previous: " + this.getCapabilityValue('measure_cloudiness')); 
                    this.log("Cloudiness new: " + cloudiness);
                    let state = {
                        "measure_cloudiness": cloudiness
                    };
                    let tokens = {
                        "measure_cloudiness": cloudiness,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerCloudinessChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerCloudinessChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_visibility') !== visibility && visibility !== undefined) {
                    this.log("Visibility previous: " + this.getCapabilityValue('measure_visibility'));
                    this.log("Visibility new: " + visibility);
                    let state = {
                        "measure_visibility": visibility
                    };
                    let tokens = {
                        "measure_visibility": visibility,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerVisibilityChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerVisibilityChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_rain') !== rain && rain !== undefined) {
                    this.log("Rain previous: " + this.getCapabilityValue('measure_rain'));
                    this.log("Rain new: " + rain);
                    let state = {
                        "measure_rain": rain
                    };
                    let tokens = {
                        "measure_rain": rain,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerRainChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_snow') !== snow && snow !== undefined) {
                    this.log("Snow previous: " + this.getCapabilityValue('measure_snow'));
                    this.log("Snow new: " + snow);
                    let state = {
                        "measure_visibility": snow
                    };
                    let tokens = {
                        "measure_snow": snow,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerSnowChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerSnowChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('sunrise') !== sunrise && sunrise !== undefined) {
                    this.log("Sunrise previous: " + this.getCapabilityValue('sunrise'));
                    this.log("Sunrise new: " + sunrise);
                    let state = {
                        "sunrise": sunrise
                    };
                    let tokens = {
                        "sunrise": sunrise,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerSunriseChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerSnowChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('sunset') !== sunset && sunset !== undefined) {
                    this.log("Sunset previous: " + this.getCapabilityValue('sunset'));
                    this.log("Sunset new: " + sunset);
                    let state = {
                        "sunset": sunset
                    };
                    let tokens = {
                        "sunset": sunset,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerSunsetChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerSnowChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('conditioncode') !== conditioncode && conditioncode !== undefined) {
                    this.log("Conditioncode previous: " + this.getCapabilityValue('conditioncode'));
                    this.log("Conditioncode new: " + conditioncode);
                    let state = {
                        "conditioncode": conditioncode
                    };
                    let tokens = {
                        "conditioncode": conditioncode,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerConditionChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerConditionChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('conditioncode_detail') !== conditioncode_detail && conditioncode_detail !== undefined) {
                    this.log("Conditioncode_detail previous: " + this.getCapabilityValue('conditioncode_detail'));
                    this.log("Conditioncode_detail new: " + conditioncode_detail);
                    let state = {
                        "conditioncode": conditioncode_detail_number
                    };
                    let tokens = {
                        "conditioncode": conditioncode_detail_number,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerConditionDetailChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerConditionDetailChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('description') !== description && description !== undefined) {
                    this.log("Description previous: " + this.getCapabilityValue('description'));
                    this.log("Description new: " + description);
                    let state = {
                        "description": description
                    };
                    let tokens = {
                        "description": description,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWeatherChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_humidity') !== hum && hum !== undefined) {
                    this.log("Humidity previous: " + this.getCapabilityValue('measure_humidity'));
                    this.log("Humidity new: " + hum);
                    let state = {
                        "measure_humidity": hum
                    };
                    let tokens = {
                        "measure_humidity": hum,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerHumidityChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_pressure') !== pressure && pressure !== undefined) {
                    this.log("Pressure previous: " + this.getCapabilityValue('measure_pressure'));
                    this.log("Pressure new: " + pressure);
                    let state = {
                        "measure_pressure": pressure
                    };
                    let tokens = {
                        "measure_pressure": pressure,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerPressureChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_wind_combined') !== windcombined && windcombined !== undefined) {
                    this.log("Wind_combined previous: " + this.getCapabilityValue('measure_wind_combined'));
                    this.log("Wind_combined new: " + windcombined);
                    let state = {
                        "measure_wind_combined": windcombined
                    };
                    let tokens = {
                        "measure_wind_combined": windcombined,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWindCombinedChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_windstrength_beaufort') !== windspeedbeaufort && windspeedbeaufort !== undefined) {
                    this.log("Windstrength previous: " + this.getCapabilityValue('measure_windstrength_beaufort') );
                    this.log("Windstrength new: " + windspeedbeaufort );
                    let state = {
                        "measure_windstrength_beaufort": windspeedbeaufort
                    };
                    let tokens = {
                        "measure_windstrength_beaufort": windspeedbeaufort,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWindBeaufortChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWindBeaufortChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_wind_direction_string') !== winddegcompass && winddegcompass !== undefined) {
                    this.log("Wind_direction_string previous: " + this.getCapabilityValue('measure_wind_direction_string') );
                    this.log("Wind_direction_string new: " + winddegcompass );
                    let state = {
                        "measure_wind_direction_string": winddegcompass
                    };
                    let tokens = {
                        "measure_wind_direction_string": winddegcompass,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWindDirectionCompassChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWindDirectionCompassChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_wind_strength') !== windstrength && windstrength !== undefined) {
                    this.log("Wind_strength previous: " + this.getCapabilityValue('measure_wind_strength'));
                    this.log("Wind_strength new: " + windstrength);
                    let state = {
                        "measure_wind_strength": windstrength
                    };
                    let tokens = {
                        "measure_wind_strength": windstrength,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWindStrengthChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
                }
                if (this.getCapabilityValue('measure_wind_angle') !== windangle && windangle !== undefined) {
                    this.log("Wind_angle previous: " + this.getCapabilityValue('measure_wind_angle'));
                    this.log("Wind_angle new: " + windangle);
                    let state = {
                        "measure_wind_angle": windangle
                    };
                    let tokens = {
                        "measure_wind_angle": windangle,
                        "location": GEOlocation
                    };
                    triggerList.push({'trigger':this._flowTriggerWindAngleChanged, 'device':device, 'token':tokens, 'state':state});
                    // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
                }
                
                // update each interval, even if unchanged.
                const capabilitySet = {
                    'forecast_time': forecast_time,
                    'conditioncode': conditioncode,
                    'conditioncode_text': conditioncodeText,
                    'conditioncode_detail': conditioncode_detail,
                    'measure_temperature': temp,
                    "measure_temperature_feelslike": temp_feelslike,
                    "measure_temperature_min": temp_min,
                    "measure_temperature_max": temp_max,
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
                    'measure_visibility': visibility,
                    'description': description,
                    'sunrise': sunrise,
                    'sunset': sunset
                };

                this.getCapabilities().forEach(async capability => {
                    this.log("Capability: " + capability + ":" + capabilitySet[capability]);
                    if (capabilitySet[capability] != undefined) {
                        await this.setCapabilityValue(capability, capabilitySet[capability]);
                            // .catch(err => this.error(err));
                    } else {
                        this.log("Capability undefined: " + capability)
                    }
                });

                // await this.setCapabilityOptions( "measure_wind_strength", {"units": "m/s" } );
        
                this.log("Trigger Flows...")
                for (let i=0; i<triggerList.length; i++){
                    if (triggerList[i].trigger){
                        triggerList[i].trigger.trigger(triggerList[i].device, triggerList[i].token, triggerList[i].state);
                        // .catch(err => this.error(err));;
                    }
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
                    case 'pollingActive':
                        this.log('pollingActive changed to ' + settings.newSettings.pollingActive);
                        newSettings.pollingActive = settings.newSettings.pollingActive;
                        break;
                    case 'pollingInterval':
                        this.log('pollingInterval changed to ' + settings.newSettings.pollingInterval);
                        newSettings.pollingInterval = settings.newSettings.pollingInterval;
                        if (!newSettings.pollingInterval || newSettings.pollingInterval == 0){
                            newSettings.pollingInterval = intervalCurrent;
                        }
                        break;
                    case "windspeed_ms":
                        this.log('windspeed_ms changed to '+settings.newSettings.windspeed_ms);
                        if ( settings.newSettings.windspeed_ms == true){
                            this.setCapabilityOptions( "measure_wind_strength", {"units": "m/s" } );
                        }
                        else{
                            if ( this.homey.i18n.getUnits() == 'metric'){
                                this.setCapabilityOptions( "measure_wind_strength", {"units": "km/h" } );
                            }
                            else{
                                this.setCapabilityOptions( "measure_wind_strength", {"units": "mph" } );
                            }
                        }
                        break;
                    default:
                        this.log("Key not matched: " + i);
                        break;
                }
            }
            newSettings["units"] = this.homey.i18n.getUnits();
            newSettings["language"] = this.homey.i18n.getLanguage();    
            newSettings['lat'] = settings.newSettings['lat'];
            newSettings['lon'] = settings.newSettings['lon'];
            newSettings["APIKey"] = settings.newSettings["APIKey"];
            clearInterval(this.pollingintervalcurrent);
            if (newSettings.pollingActive == true){
                this.pollWeatherCurrent(newSettings);
            }
        } catch (error) {
            throw error;
        }
    }
}
module.exports = owmCurrenWeather;