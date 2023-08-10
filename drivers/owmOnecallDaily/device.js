'use strict';

const Homey = require('homey');
const owm = require('../../lib/owm_api_deprecated.js');

class owmOnecallDaily extends Homey.Device {

    async onInit() {
        let name = this.getName() + '_' + this.getData().id;
        this.log('OnecallDaily init: '+name);

        await this.updateCapabilities();
        await this.checkParentDevice();
        // // Intervall to check parent device is still existing
        // this.checkParentInterval = setInterval(_ => {
        //     this.checkParentDevice()
        // }, 60 * 1000 * 2);

        // Flows
        this._flowTriggerTemperatureMinChanged = this.homey.flow.getDeviceTriggerCard('TemperatureMinChanged');
        this._flowTriggerTemperatureMaxChanged = this.homey.flow.getDeviceTriggerCard('TemperatureMaxChanged');
        this._flowTriggerTemperatureMorningChanged = this.homey.flow.getDeviceTriggerCard('TemperatureMorningChanged');
        this._flowTriggerTemperatureDayChanged = this.homey.flow.getDeviceTriggerCard('TemperatureDayChanged');
        this._flowTriggerTemperatureEveningChanged = this.homey.flow.getDeviceTriggerCard('TemperatureEveningChanged');
        this._flowTriggerTemperatureNightChanged = this.homey.flow.getDeviceTriggerCard('TemperatureNightChanged');

        // this._flowTriggerTemperatureFeelslikeChanged = this.homey.flow.getDeviceTriggerCard('TemperatureFeelslikeChanged');

        this._flowTriggerConditionChanged = this.homey.flow.getDeviceTriggerCard('ConditionChanged');
        this._flowTriggerConditionDetailChanged = this.homey.flow.getDeviceTriggerCard('ConditionDetailChanged');
        this._flowTriggerWeatherChanged = this.homey.flow.getDeviceTriggerCard('WeatherChanged');

        this._flowTriggerWindBeaufortChanged = this.homey.flow.getDeviceTriggerCard('WindBeaufortChanged');
        this._flowTriggerWindDirectionCompassChanged = this.homey.flow.getDeviceTriggerCard('WindDirectionCompassChanged');
        this._flowTriggerWindCombinedChanged = this.homey.flow.getDeviceTriggerCard('WindCombinedChanged');
        this._flowTriggerWindStrengthChanged = this.homey.flow.getDeviceTriggerCard('WindStrengthChanged');
        this._flowTriggerWindGustChanged = this.homey.flow.getDeviceTriggerCard('WindGustChanged');
        this._flowTriggerWindAngleChanged = this.homey.flow.getDeviceTriggerCard('WindAngleChanged');

        this._flowTriggerUltravioletChanged = this.homey.flow.getDeviceTriggerCard('UltravioletChanged');
        this._flowTriggerCloudinessChanged = this.homey.flow.getDeviceTriggerCard('CloudinessChanged');
        // this._flowTriggerVisibilityChanged = this.homey.flow.getDeviceTriggerCard('VisibilityChanged');
        this._flowTriggerRainChanged = this.homey.flow.getDeviceTriggerCard('RainChanged');
        this._flowTriggerSnowChanged = this.homey.flow.getDeviceTriggerCard('SnowChanged');
        this._flowTriggerHumidityChanged = this.homey.flow.getDeviceTriggerCard('HumidityChanged');
        this._flowTriggerPressureChanged = this.homey.flow.getDeviceTriggerCard('PressureChanged');
        this._flowTriggerPopChanged = this.homey.flow.getDeviceTriggerCard('PopChanged');
        this._flowTriggerDewPointChanged = this.homey.flow.getDeviceTriggerCard('DewPointChanged');

        this._flowTriggerSunsetChanged = this.homey.flow.getDeviceTriggerCard('SunsetChanged');
        this._flowTriggerSunriseChanged = this.homey.flow.getDeviceTriggerCard('SunriseChanged');
        this._flowTriggerMoonsetChanged = this.homey.flow.getDeviceTriggerCard('MoonsetChanged');
        this._flowTriggerMoonriseChanged = this.homey.flow.getDeviceTriggerCard('MoonriseChanged');
        this._flowTriggerMoonphaseChanged = this.homey.flow.getDeviceTriggerCard('MoonphaseChanged');

    } // end onInit

    async updateCapabilities(){
        // add missing capabilities
        let capabilities = [];
        try{
            capabilities = this.homey.app.manifest.drivers.filter((e) => {return (e.id == this.driver.id);})[0].capabilities;
        }
        catch (error){}
        for (let i=0; i<capabilities.length; i++){
            if (!this.hasCapability(capabilities[i])){
                await this.addCapability(capabilities[i]);
            }
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

    async updateDevice(dailyData){
        this.log(this.getData().id +" Received OWM daily data");

        let units = this.homey.i18n.getUnits();
        // let language = this.homey.i18n.getLanguage();
        let GEOlocation = this.getName();

        let device = this;
        let triggerList = [];

        let days = parseInt(this.getSetting("days"));
        if (days == null || days < 0 || days > 47){
            return;
        }
        if (days == ''){
            days = 0;
        }
        this.log("Daily period: "+days);
        let data = dailyData[days];
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

        var temp_min = Math.round(data.temp.min * 10) / 10;
        var temp_max = Math.round(data.temp.max * 10) / 10;
        var temp_morning = Math.round(data.temp.morn * 10) / 10;
        var temp_day = Math.round(data.temp.day * 10) / 10;
        var temp_evening = Math.round(data.temp.eve * 10) / 10;
        var temp_night = Math.round(data.temp.night * 10) / 10;
        // var temp_feelslike = Math.round(data.feels_like* 10) / 10;
        var hum = data.humidity;
        var pressure = data.pressure;
        var dewpoint = Math.round(data.dew_point * 10) / 10;

        var uvi = data.uvi;
        var cloudiness = data.clouds;
        // var visibility = data.visibility;
        var pop = Math.round(data.pop * 100);

        let sunr = new Date(data.sunrise*1000).toLocaleString('en-US', 
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

        let suns = new Date(data.sunset*1000).toLocaleString('en-US', 
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

        let moonr = new Date(data.moonrise*1000).toLocaleString('en-US', 
        { 
            hour12: false, 
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
        let moonrise = moonr.split(", ")[1];

        let moons = new Date(data.moonset*1000).toLocaleString('en-US', 
        { 
            hour12: false, 
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
        let moonset = moons.split(", ")[1];

        let moonphase = data.moon_phase;
        let moonphase_type = '';
        if ( moonphase >= 0 && moonphase <= 0.063 ){
            moonphase_type = 'NM';
        }
        else if ( moonphase > 0.063 && moonphase <= 0.188 ){
            moonphase_type = 'ZS';
        }
        else if ( moonphase > 0,188 && moonphase <= 0.313 ){
            moonphase_type = 'ZH';
        }
        else if ( moonphase > 0.313 && moonphase <= 0.438 ){
            moonphase_type = 'ZM';
        }
        else if ( moonphase > 0.438 && moonphase <= 0.563 ){
            moonphase_type = 'VM';
        }
        else if ( moonphase > 0.563 && moonphase <= 0.688 ){
            moonphase_type = 'AM';
        }
        else if ( moonphase > 0.688 && moonphase <= 0.813 ){
            moonphase_type = 'AH';
        }
        else if ( moonphase > 0.813 && moonphase <= 0.938 ){
            moonphase_type = 'AS';
        }
        else if ( moonphase > 0.938 && moonphase <= 1 ){
            moonphase_type = 'NM';
        }

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
        } 
        else {
            var windstrength = 0;
        }

        if (data.wind_gust) {
            if ( this.getSetting('windspeed_ms') == true){
                if (units == "metric") {
                    var windgust = data.wind_gust;
                } else {
                    // mph to m/s
                    var windgust = Math.round(data.wind_gust / 2.237);
                }
            }
            else{
                if (units == "metric") {
                    // convert from m/s to km/h
                    var windgust = Math.round(3.6 * data.wind_gust);
                } else {
                    // windspeed in mph
                    var windgust = data.wind_gust;
                }
            }
        } else {
            var windgust = 0;
        }


        if (data.wind_deg) {
            var windangle = data.wind_deg;
            var winddegcompass = owm.degToCompass(windangle);
            if (winddegcompass == undefined){
                this.log("Could not get wind compass text for windangle: "+windangle);
                winddegcompass = "";
            }

        } else {
            var windangle = 0;
            var winddegcompass = "";
        }
        if (units == "metric") {
            // convert to beaufort and concatenate in a string with wind direction
            var windspeedbeaufort = owm.beaufortFromKmh(windstrength);
        } else {
            var windspeedbeaufort = owm.beaufortFromMph(windstrength);
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
        if (this.getCapabilityValue('measure_temperature_morning') !== temp_morning && temp_morning !== undefined) {
            this.log("Temp.Morning previous: " + this.getCapabilityValue('measure_temperature_morning') );
            this.log("Temp.Morning new: " + temp_morning );
            let state = {
                "measure_temperature_morning": temp_morning
            };
            let tokens = {
                "measure_temperature_morning": temp_morning,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerTemperatureMorningChanged, 'device':device, 'token':tokens, 'state':state});
            // this._flowTriggerTemperatureChanged.trigger(device, tokens, state).catch(this.error)
        }
        if (this.getCapabilityValue('measure_temperature_day') !== temp_day && temp_day !== undefined) {
            this.log("Temp.Day previous: " + this.getCapabilityValue('measure_temperature_day') );
            this.log("Temp.Day new: " + temp_day );
            let state = {
                "measure_temperature_day": temp_day
            };
            let tokens = {
                "measure_temperature_day": temp_day,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerTemperatureDayChanged, 'device':device, 'token':tokens, 'state':state});
            // this._flowTriggerTemperatureChanged.trigger(device, tokens, state).catch(this.error)
        }
        if (this.getCapabilityValue('measure_temperature_evening') !== temp_evening && temp_evening !== undefined) {
            this.log("Temp.Evening previous: " + this.getCapabilityValue('measure_temperature_evening') );
            this.log("Temp.Evening new: " + temp_evening );
            let state = {
                "measure_temperature_evening": temp_evening
            };
            let tokens = {
                "measure_temperature_evening": temp_evening,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerTemperatureEveningChanged, 'device':device, 'token':tokens, 'state':state});
            // this._flowTriggerTemperatureChanged.trigger(device, tokens, state).catch(this.error)
        }
        if (this.getCapabilityValue('measure_temperature_night') !== temp_night && temp_night !== undefined) {
            this.log("Temp.Night previous: " + this.getCapabilityValue('measure_temperature_night') );
            this.log("Temp.Night new: " + temp_night );
            let state = {
                "measure_temperature_night": temp_night
            };
            let tokens = {
                "measure_temperature_night": temp_night,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerTemperatureNightChanged, 'device':device, 'token':tokens, 'state':state});
            // this._flowTriggerTemperatureChanged.trigger(device, tokens, state).catch(this.error)
        }
        // if (this.getCapabilityValue('measure_temperature_feelslike') !== temp_feelslike && temp_feelslike !== undefined) {
        //     this.log("Temp.FeelsLike previous: " + this.getCapabilityValue('measure_temperature_feelslike') );
        //     this.log("Temp.FeelsLike new: " + temp_feelslike );
        //     let state = {
        //         "measure_temperature_feelslike": temp_feelslike
        //     };
        //     let tokens = {
        //         "measure_temperature_feelslike": temp_feelslike,
        //         "location": GEOlocation
        //     };
        //     triggerList.push({'trigger':this._flowTriggerTemperatureFeelslikeChanged, 'device':device, 'token':tokens, 'state':state});
        //     // this._flowTriggerTemperatureFeelslikeChanged.trigger(device, tokens, state).catch(this.error)
        // }
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
        // if (this.getCapabilityValue('measure_visibility') !== visibility && visibility !== undefined) {
        //     this.log("Visibility previous: " + this.getCapabilityValue('measure_visibility'));
        //     this.log("Visibility new: " + visibility);
        //     let state = {
        //         "measure_visibility": visibility
        //     };
        //     let tokens = {
        //         "measure_visibility": visibility,
        //         "location": GEOlocation
        //     };
        //     triggerList.push({'trigger':this._flowTriggerVisibilityChanged, 'device':device, 'token':tokens, 'state':state});
        //     // this._flowTriggerVisibilityChanged.trigger(device, tokens, state).catch(this.error)
        // }
        if (this.getCapabilityValue('measure_snow') !== snow && snow !== undefined) {
            this.log("Snow previous: " + this.getCapabilityValue('measure_snow'));
            this.log("Snow new: " + snow);
            let state = {
                "measure_snow": snow
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
            this.log("Pop new: " + pop);
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
        if (this.getCapabilityValue('measure_wind_gust') !== windgust && windgust !== undefined) {
            this.log("Wind_gust previous: " + this.getCapabilityValue('measure_wind_gust'));
            this.log("Wind_gust new: " + windgust);
            let state = {
                "measure_wind_gust": windgust
            };
            let tokens = {
                "measure_wind_gust": windgust,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerWindGustChanged, 'device':device, 'token':tokens, 'state':state});
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
            // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
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
            // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
        }
        if (this.getCapabilityValue('moonrise') !== moonrise && moonrise !== undefined) {
            this.log("Moonrise previous: " + this.getCapabilityValue('moonrise'));
            this.log("Moonrise new: " + moonrise);
            let state = {
                "moonrise": moonrise
            };
            let tokens = {
                "moonrise": moonrise,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerMoonriseChanged, 'device':device, 'token':tokens, 'state':state});
            // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
        }
        if (this.getCapabilityValue('moonset') !== moonset && moonset !== undefined) {
            this.log("Moonset previous: " + this.getCapabilityValue('moonset'));
            this.log("Moonset new: " + moonset);
            let state = {
                "moonset": moonset
            };
            let tokens = {
                "moonset": moonset,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerMoonsetChanged, 'device':device, 'token':tokens, 'state':state});
            // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
        }
        if (this.getCapabilityValue('moonphase') !== moonphase && moonphase !== undefined) {
            this.log("Moonphase previous: " + this.getCapabilityValue('moonphase'));
            this.log("Moonphase new: " + moonphase);
            let state = {
                "moonphase": moonphase,
                "moonphase_type": moonphase_type
            };
            let tokens = {
                "moonphase": moonphase,
                "moonphase_type": moonphase_type,
                "location": GEOlocation
            };
            triggerList.push({'trigger':this._flowTriggerMoonphaseChanged, 'device':device, 'token':tokens, 'state':state});
            // this._flowTriggerWeatherChanged.trigger(device, tokens, state).catch(this.error)
        }

        const capabilitySet = {
            'forecast_time': forecast_time,
            'description': description,
            'conditioncode': conditioncode,
            'conditioncode_text': conditioncodeText,
            'conditioncode_detail': conditioncode_detail,
            'measure_temperature_min': temp_min,
            'measure_temperature_max': temp_max,
            'measure_temperature_morning': temp_morning,
            'measure_temperature_day': temp_day,
            'measure_temperature_evening': temp_evening,
            'measure_temperature_night': temp_night,
            'measure_humidity': hum,
            'measure_pressure': pressure,
            'measure_dew_point': dewpoint,
            'measure_rain': rain,
            'measure_pop': pop,
            'measure_snow': snow,
            'measure_ultraviolet': uvi,
            'measure_cloudiness': cloudiness,
            'sunrise': sunrise,
            'sunset': sunset,
            'moonrise': moonrise,
            'moonset': moonset,
            'moonphase_type': moonphase_type,
            'measure_wind_strength': windstrength,
            'measure_wind_gust': windgust,
            'measure_wind_direction_string': winddegcompass,
            'measure_wind_combined': windcombined,
            'measure_wind_angle': windangle,
            'measure_windstrength_beaufort': windspeedbeaufort
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
            if (triggerList[i].trigger){
                triggerList[i].trigger.trigger(triggerList[i].device, triggerList[i].token, triggerList[i].state).catch(err => this.log(err.message));
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
module.exports = owmOnecallDaily;