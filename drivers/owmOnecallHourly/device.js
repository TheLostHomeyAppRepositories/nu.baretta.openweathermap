'use strict';

const Homey = require('homey');
const weather = require('../../owm_api.js');

class owmOnecallHourly extends Homey.Device {

    async onInit() {
        let name = this.getName() + '_' + this.getData().id;
        this.log('OnecallHourly init: '+name);

        await this.updateCapabilities();
        await this.checkParentDevice();
        // // Intervall to check parent device is still existing
        // this.checkParentInterval = setInterval(_ => {
        //     this.checkParentDevice()
        // }, 60 * 1000 * 2);

        // Flows
        this._flowTriggerTemperatureChanged = this.homey.flow.getDeviceTriggerCard('TemperatureChanged');

        this._flowTriggerTemperatureFeelslikeChanged = this.homey.flow.getDeviceTriggerCard('TemperatureFeelslikeChanged');

        this._flowTriggerConditionChanged = this.homey.flow.getDeviceTriggerCard('ConditionChanged');

        this._flowTriggerConditionDetailChanged = this.homey.flow.getDeviceTriggerCard('ConditionDetailChanged');

        this._flowTriggerWeatherChanged = this.homey.flow.getDeviceTriggerCard('WeatherChanged');

        this._flowTriggerWindBeaufortChanged = this.homey.flow.getDeviceTriggerCard('WindBeaufortChanged');

        this._flowTriggerWindDirectionCompassChanged = this.homey.flow.getDeviceTriggerCard('WindDirectionCompassChanged');

        this._flowTriggerUltravioletChanged = this.homey.flow.getDeviceTriggerCard('UltravioletChanged');

        this._flowTriggerCloudinessChanged = this.homey.flow.getDeviceTriggerCard('CloudinessChanged');

        this._flowTriggerVisibilityChanged = this.homey.flow.getDeviceTriggerCard('VisibilityChanged');

        this._flowTriggerSnowChanged = this.homey.flow.getDeviceTriggerCard('SnowChanged');

        this._flowTriggerHumidityChanged = this.homey.flow.getDeviceTriggerCard('HumidityChanged');
        
        this._flowTriggerPressureChanged = this.homey.flow.getDeviceTriggerCard('PressureChanged');

        this._flowTriggerDewPointChanged = this.homey.flow.getDeviceTriggerCard('DewPointChanged');

        this._flowTriggerRainChanged = this.homey.flow.getDeviceTriggerCard('RainChanged');

        this._flowTriggerPopChanged = this.homey.flow.getDeviceTriggerCard('PopChanged');

        this._flowTriggerWindCombinedChanged = this.homey.flow.getDeviceTriggerCard('WindCombinedChanged');
        
        this._flowTriggerWindStrengthChanged = this.homey.flow.getDeviceTriggerCard('WindStrengthChanged');

        this._flowTriggerWindAngleChanged = this.homey.flow.getDeviceTriggerCard('WindAngleChanged');

    } // end onInit

    async updateCapabilities(){
        // add new capabilities
        if (!this.hasCapability('measure_dew_point')){
            await this.addCapability('measure_dew_point');
        }
        if (!this.hasCapability('conditioncode_text')){
            await this.addCapability('conditioncode_text');
        }

    }

    async checkParentDevice(){
        // check if parent still exists
        let deviceList = this.homey.drivers.getDriver('owmOnecallCurrent').getDevices();
        let parentFound = false;
        for (let i=0; i<deviceList.length; i++){
            if (deviceList[i].getData().id == this.getData().locationId){
                parentFound = true;
            }
        }
        if (parentFound == false){
            this.setDeviceUnavailable(this.homey.__("device_unavailable_reason.location_not_available"));
        }        
    }

    onAdded() {
        let id = this.getData().id;
        this.log('device added: ', id);

    } // end onAdded

    onDeleted() {

        let id = this.getData().id;
        clearInterval(this.checkParentInterval);
        this.log('device deleted:', id);

    } // end onDeleted

    async setDeviceUnavailable(message){
        await this.setUnavailable(message);
    }

    async setDeviceAvailable(){
        if ( !this.getAvailable() ){
            await this.setAvailable();
        }
    }

    async updateDevice(hourlyData){
        this.log(this.getData().id +" Received OWM hourly data");

        let units = this.homey.i18n.getUnits();
        // let language = this.homey.i18n.getLanguage();
        let GEOlocation = this.getName();

        let device = this;
        let triggerList = [];

        let hours = parseInt(this.getSetting("hours"));
        if (hours == null || hours < 0 || hours > 47){
            return;
        }
        if (hours == ''){
            hours = 0;
        }
        this.log("Hourly period: "+hours);
        let data = hourlyData[hours];
        if (!data){
            return;
        }

        let tz  = this.homey.clock.getTimezone();
        let forecast_time;
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
            forecast_time = now.replace(',', '');;
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
        }

        // now = new Date().toLocaleString('de-DE', 
        // { 
        //     hour12: false, 
        //     timeZone: tz,
        //     hour: "2-digit",
        //     minute: "2-digit",
        //     day: "2-digit",
        //     month: "2-digit",
        //     year: "numeric"
        // });
        // date = now.split(", ")[0];
        // date = date.split("/")[2] + "-" + date.split("/")[0] + "-" + date.split("/")[1]; 
        // time = now.split(", ")[1];
        // let lastUpdate = 'Last update: ' + date + " " + time;
        // this.setSettings({
        //     "APIState": lastUpdate
        //     })
        //     .catch(this.error);

        let description = data.weather[0].description;

        var conditioncode = data.weather[0].main;
        this.log("Main conditioncode: " + data.weather[0].main);
        var conditioncodeText = this.homey.app.getConditioncodeText(conditioncode);

        var conditioncode_detail = data.weather[0].id.toString();
        var conditioncode_detail_number = data.weather[0].id;
        this.log("Specific conditioncode: " + data.weather[0].id);

        var temp = Math.round(data.temp* 10) / 10;
        var temp_feelslike = Math.round(data.feels_like* 10) / 10;
        var hum = data.humidity;
        var pressure = data.pressure;
        var dewpoint = Math.round(data.dew_point * 10) / 10;

        var uvi = data.uvi;
        var cloudiness = data.clouds;
        var visibility = data.visibility;
        var pop = Math.round(data.pop * 100);

        // return the rain in mm if present, or precipitation
        if (data.precipitation) {
            var rain = data.precipitation.value;
        }

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

        if (data.wind_speed) {
            if ( this.getSetting('windspeed_ms') == true){
                if (units == "metric") {
                    var windstrength = data.wind_speed;
                } else {
                    // mph to m/s
                    var windstrength = Math.round(data.wind_speed / 2.237);
                }
            }
            else{
                if (units == "metric") {
                    // convert from m/s to km/h
                    var windstrength = Math.round(3.6 * data.wind_speed);
                } else {
                    // windspeed in mph
                    var windstrength = data.wind_speed;
                }
            }
        } else {
            var windstrength = 0;
        }

        if (data.wind_deg) {
            var windangle = data.wind_deg;
            var winddegcompass = weather.degToCompass(windangle);
        } else {
            var windangle = 0;
            var winddegcompass = "";
        }
        if (units == "metric") {
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
        if (this.getCapabilityValue('measure_ultraviolet') !== uvi && uvi !== undefined) {
            this.log("UV index previous: " + this.getCapabilityValue('measure_ultraviolet'));
            this.log("UV index new: " + uvi);
            let state = {
                "measure_ultraviolet": uvi
            };
            let tokens = {
                "measure_ultraviolet": uvi,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerUltravioletChanged, 'device':device, 'token':tokens, 'state':state});
            // this._flowTriggerUltravioletChanged.trigger(device, tokens, state).catch(this.error)
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
        if (this.getCapabilityValue('measure_dew_point') !== dewpoint && dewpoint !== undefined) {
            this.log("Dewpoint previous: " + this.getCapabilityValue('measure_dew_point'));
            this.log("Dewpoint new: " + dewpoint);
            let state = {
                "measure_dew_point": dewpoint
            };
            let tokens = {
                "measure_dew_point": dewpoint,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerDewPointChanged, 'device':device, 'token':tokens, 'state':state});
            // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
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
        if (this.getCapabilityValue('measure_pop') !== pop && pop !== undefined) {
            this.log("Pop previous: " + this.getCapabilityValue('measure_pop'));
            this.log("Pop new: " + rain);
            let state = {
                "measure_pop": pop
            };
            let tokens = {
                "measure_pop": pop,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerPopChanged, 'device':device, 'token':tokens, 'state':state});
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

        this.setCapabilityValue("forecast_time", forecast_time);
        this.setCapabilityValue("description", description);
        this.setCapabilityValue("conditioncode", conditioncode);
        this.setCapabilityValue("conditioncode_text", conditioncodeText);
        this.setCapabilityValue("conditioncode_detail", conditioncode_detail);
        this.setCapabilityValue("measure_temperature", temp).catch(err => this.err(err));
        this.setCapabilityValue("measure_temperature_feelslike", temp_feelslike);
        this.setCapabilityValue("measure_humidity", hum);
        this.setCapabilityValue("measure_pressure", pressure);
        this.setCapabilityValue("measure_dew_point", dewpoint);
        this.setCapabilityValue("measure_rain", rain);
        this.setCapabilityValue("measure_pop", pop);
        this.setCapabilityValue("measure_snow", snow);
        this.setCapabilityValue("measure_ultraviolet", uvi);
        this.setCapabilityValue("measure_cloudiness", cloudiness);
        this.setCapabilityValue("measure_visibility", visibility);
        this.setCapabilityValue("measure_wind_strength", windstrength);
        this.setCapabilityValue("measure_wind_direction_string", winddegcompass);
        this.setCapabilityValue("measure_wind_combined", windcombined);
        this.setCapabilityValue("measure_wind_angle", windangle);
        this.setCapabilityValue("measure_windstrength_beaufort", windspeedbeaufort);

        this.log("Trigger Flows...")
        for (let i=0; i<triggerList.length; i++){
            if (triggerList[i].trigger){
                triggerList[i].trigger.trigger(triggerList[i].device, triggerList[i].token, triggerList[i].state);
                // .catch(err => this.error(err));
            }
        }

    }

    // parameters: {settings, newSettingsObj, changedKeysArr}
    onSettings(settings) {
        try {
            for (let i = 0; i < settings.changedKeys.length; i++) {
                switch (settings.changedKeys[i]) {
                    case "windspeed_ms":
                        this.log('windspeed_ms changed to '+settings.newSettings.windspeed_ms);
                        if ( settings.newSettings.windspeed_ms == true){
                            this.setCapabilityOptions( "measure_wind_strength", {"units": "m/s" } );

                            if ( this.homey.i18n.getUnits() == 'metric'){
                                this.setCapabilityValue("measure_wind_strength", 
                                    Math.round(this.getCapabilityValue("measure_wind_strength") * 10 / 3.6) / 10
                                );
                            }
                            else{
                                this.setCapabilityValue("measure_wind_strength", 
                                    Math.round(this.getCapabilityValue("measure_wind_strength") * 10 / 2.237) / 10
                                );
                            }

                        }
                        else{
                            if ( this.homey.i18n.getUnits() == 'metric'){
                                this.setCapabilityOptions( "measure_wind_strength", {"units": "km/h" } );
                                this.setCapabilityValue("measure_wind_strength", 
                                    Math.round(this.getCapabilityValue("measure_wind_strength") * 3.6)
                                );
                            }
                            else{
                                this.setCapabilityOptions( "measure_wind_strength", {"units": "mph" } );
                                this.setCapabilityValue("measure_wind_strength", 
                                    Math.round(this.getCapabilityValue("measure_wind_strength") * 2.237)
                                );
                            }
                        }
                        break;
                    default:
                        this.log("Key not matched: " + i);
                        break;
                }
            }
        } catch (error) {
            throw error;
        }
    }

}
module.exports = owmOnecallHourly;