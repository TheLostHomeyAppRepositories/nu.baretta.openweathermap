'use strict';

const { throws } = require('assert');
const Homey = require('homey');
const owm = require('../../lib/owm_api.js');
const intervalCurrent = 5;

class owmOnecallDailySummary extends Homey.Device {

    async onInit() {
        this.log('OnecallDailySummary init: ', this.getName(), this.getData().id);

        await this.updateCapabilities();

        this.data = require('./data.js').DATA_DEF;

        let settings = await this.getSettings();
        if (!settings.pollingInterval || settings.pollingInterval == 0){
            settings.pollingInterval = intervalCurrent;
            this.setSettings(settings);
        }

        settings["units"] = this.homey.i18n.getUnits();
        settings["language"] = this.homey.i18n.getLanguage();

        // Flows
        this.registerFlowTrigger();

        //run once to get the first data
        if (settings.pollingActive == true){
            this.setPollInterval(settings);
        }
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

    onAdded() {
        this.log('device added: ', this.getName(), this.getData().id);

    } // end onAdded

    onDeleted() {
        this.homey.clearInterval(this.pollinginterval);
        this.log('device deleted:', this.getName(), this.getData().id);
    } // end onDeleted

    async setDeviceUnavailable(message){
        try{
            await this.setUnavailable(message);
        }
        catch (error){
            this.log("Error setting device unavailable: ", error.message);
        }
    }

    async setDeviceAvailable(){
        if ( !this.getAvailable() ){
            try{
                await this.setAvailable();
            }
            catch (error){
                this.log("Error setting device available: ", error.message);
            }
        }
    }

    registerFlowTrigger(){
        let dataKeys = Object.keys(this.data);
        for(let i=0; i<dataKeys.length; i++){
            let item = this.data[dataKeys[i]]; 
            if (item.trigger != undefined){
                try{
                    item['trigger_instance'] = this.homey.flow.getDeviceTriggerCard(item.trigger);
                }
                catch(error){
                    this.log("Error registzering trigger '", item.trigger, "': ", error.message);
                }
            }
        }
    }

    getDataCapability(capability){
        if (this.data == undefined){
            throw new Error("Device definition not found.");
        }
        if (this.data[capability] == undefined){
            throw new Error("Device definition not found for capability: "+capability);
        }
        return this.data[capability];
    }

    setPollInterval(settings) {
        //run once, then at interval
        this.pollWeatherData(settings);
        this.pollinginterval = this.homey.setInterval(
            () => this.pollWeatherData(settings).catch(error => console.log(error)),
            ( 60 * 1000 * settings.pollingInterval) );
    }

    async pollWeatherData(settings) {
        if (this.data == undefined){
            this.log("No data definition found.");
            this.setDeviceUnavailable(this.homey.__("device_unavailable_reason.no_definition"));
            return;
        }
        let dataKeys = Object.keys(this.data);
        let data;
        try{
            let tz  = this.homey.clock.getTimezone();
            let url = owm.getOnecallDailySummaryURL(settings, tz);
            data = await owm.getWeatherData(url);
        }
        catch(error){
            this.log("Error reading OWM data:", error.message);
        }
        if (!data || !data.date){
            if (data && data.message && data.cod>200){
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

        this.log(this.getName(), this.getData().id, " Received OWM data");

        //var GEOlocation = "Lat:" + data.lat + " Lon:" +data.lon;
        var GEOlocation = this.getName();
        let tz  = this.homey.clock.getTimezone();

        // let forecast_time;
        let lastUpdate;
        let hasDateLocalization = this.homey.app.hasDateLocalization();
        if (hasDateLocalization){
            // let now = new Date(data.current.dt*1000).toLocaleString(this.homey.i18n.getLanguage(), 
            // { 
            //     hour12: false, 
            //     timeZone: tz,
            //     hour: "2-digit",
            //     minute: "2-digit",
            //     day: "2-digit",
            //     month: "2-digit",
            //     year: "numeric"
            // });
            // forecast_time = now.replace(',', '');

            let now = new Date().toLocaleString(this.homey.i18n.getLanguage(), 
            { 
                hour12: false, 
                timeZone: tz,
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
            lastUpdate = now.replace(',', '');
        }
        else{
            // let now = new Date(data.current.dt*1000).toLocaleString('en-US', 
            //     { 
            //         hour12: false, 
            //         timeZone: tz,
            //         hour: "2-digit",
            //         minute: "2-digit",
            //         day: "2-digit",
            //         month: "2-digit",
            //         year: "numeric"
            //     });
            // let date = now.split(", ")[0];
            // date = date.split("/")[2] + "-" + date.split("/")[0] + "-" + date.split("/")[1]; 
            // let time = now.split(", ")[1];
            // forecast_time = date + " " + time;

            let now = new Date().toLocaleString('en-US', 
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
            lastUpdate = date + " " + time;
            }

        this.setSettings({
            "APIState": lastUpdate
            })
            .catch(this.error);
                    
        let date = new Date(data.date).toLocaleString('en-US', 
        { 
            hour12: false, 
            timeZone: tz,
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
        this.getDataCapability('forecast_time')['value'] = date;

        this.getDataCapability('measure_temperature_min')['value'] = Math.round(data.temperature.min * 10) / 10;
        this.getDataCapability('measure_temperature_max')['value'] = Math.round(data.temperature.max * 10) / 10;
        this.getDataCapability('measure_temperature_morning')['value'] = Math.round(data.temperature.morning * 10) / 10;
        this.getDataCapability('measure_temperature_day')['value'] = Math.round(data.temperature.afternoon * 10) / 10;
        this.getDataCapability('measure_temperature_evening')['value'] = Math.round(data.temperature.evening * 10) / 10;
        this.getDataCapability('measure_temperature_night')['value'] = Math.round(data.temperature.night * 10) / 10;
        

        this.getDataCapability('measure_humidity')['value'] = data.humidity.afternoon;
        this.getDataCapability('measure_pressure')['value'] = data.pressure.afternoon;
        this.getDataCapability('measure_rain')['value'] = data.precipitation.total;
        this.getDataCapability('measure_cloudiness')['value'] = data.cloud_cover.afternoon;

        // // return the rain in mm if present, or precipitation
        // let rain = 0; 
        // if (data.current.precipitation) {
        //     rain = data.current.precipitation.value;
        // }
        // if (data.current.rain != undefined) {
        //     if (typeof (data.current.rain) === "number") {
        //         rain = data.current.rain
        //     } else if (typeof (data.current.rain) === "object") {
        //         if (data.current.rain['3h'] != undefined) {
        //             rain = data.current.rain['3h'] / 3;
        //         }
        //         if (data.current.rain['1h'] != undefined) {
        //             rain = data.current.rain['1h'];
        //         }
        //         // Sometimes OWM returns an empty rain object
        //         if (Object.keys(data.current.rain).length == 0) {
        //             rain = 0;
        //         }
        //     }
        // } else {
        //     rain = 0;
        // }
        // this.getDataCapability('measure_rain')['value'] = rain;

        let windstrength = 0;
        if (data.wind.max.speed) {
            if ( this.getSetting('windspeed_ms') == true){
                if (settings["units"] == "metric") {
                    windstrength = data.wind.max.speed;
                } else {
                    // mph to m/s
                    windstrength = Math.round(data.wind.max.speed / 2.237);
                }
            }
            else{
                if (settings["units"] == "metric") {
                    // convert from m/s to km/h
                    windstrength = Math.round(3.6 * data.wind.max.speed);
                } else {
                    // windspeed in mph
                    windstrength = data.wind.max.speed;
                }
            }
        } else {
            windstrength = 0;
        }
        this.getDataCapability('measure_wind_strength')['value'] = windstrength;

        let windspeedbeaufort = 0;
        if (settings["units"] == "metric") {
            // convert to beaufort and concatenate in a string with wind direction
            windspeedbeaufort = owm.beaufortFromKmh(windstrength);
        } else {
            windspeedbeaufort = owm.beaufortFromMph(windstrength);
        }
        this.getDataCapability('measure_windstrength_beaufort')['value'] = windspeedbeaufort;

        let windangle = 0;
        let winddegcompass = "";
        if (data.wind.max.direction) {
            windangle = data.wind.max.direction;
            winddegcompass = owm.degToCompass(windangle);
            if (winddegcompass == undefined){
                this.log("Could not get wind compass text for windangle: "+windangle);
                winddegcompass = "";
            }
        } else {
            windangle = 0;
            winddegcompass = "";
        }
        this.getDataCapability('measure_wind_angle')['value'] = windangle;
        this.getDataCapability('measure_wind_direction_string')['value'] = winddegcompass;

        let windcombined = windspeedbeaufort.toString();
        if (winddegcompass != ""){
            windcombined =  this.homey.__("windDirectionIcon."+winddegcompass) + 
                            " " + 
                            this.homey.__("windDirectionShort."+winddegcompass) + 
                            " " +
                            windspeedbeaufort.toString();
        }
        this.getDataCapability('measure_wind_combined')['value'] = windcombined;

        // CAPABILITIES: Compare values and update changed capabilities.
        // TRIGGER: Compare values to start trigger after capability update.
        for (let i=0; i<dataKeys.length; i++){
            let item = this.data[dataKeys[i]]; 
            let capability = dataKeys[i];
            if (dataKeys[i] != undefined){
                if (this.getCapabilityValue(capability) != item.value){
                    this.log(this.getName() + " Data changed: " + capability + ": " + this.getCapabilityValue(capability) + " => " + item.value);
                    if (item.value == undefined){
                        item.value = null;
                    }
                    await this.setCapabilityValue(capability, item.value);
                    // .catch(error => this.log(error.message));
                    // Store temporary value to trigger flows for changed capabilities
                    if (item.trigger != undefined){
                        item['trigger_start'] = true;
                    }
                }
            }
        }

        // TRIGGER: Trigger flows for changed capabilities
        for (let i=0; i<dataKeys.length; i++){
            let item = this.data[dataKeys[i]]; 
            let capability = dataKeys[i];
            if (item.trigger != undefined != undefined && item['trigger_start'] == true){
                let state = {};
                let token = {
                    "location": GEOlocation
                };
                if (item.trigger_token_id != undefined){
                    state[item.trigger_token_id] = item.trigger_token_value;
                    token[item.trigger_token_id] = item.trigger_token_value;
                }
                else if (item.trigger_token != undefined){
                    for (let j=0; j<item.trigger_token.length; j++){
                        state[item.trigger_token[j].trigger_token_id] = item.trigger_token[j].trigger_token_value;
                        token[item.trigger_token[j].trigger_token_id] = item.trigger_token[j].trigger_token_value;
                    }
                }
                else{
                    state[capability] = item.value;
                    token[capability] = item.value;
                }                   
                this.log(this.getName() + " Trigger flow: " + item.trigger);
                item['trigger_start'] = false;
                await item.trigger_instance.trigger(this, token, state)
                    .catch(error => this.log(error.message));
            }
        }
    }

    // parameters: {settings, newSettingsObj, changedKeysArr}
    onSettings(settings) {
        try {
            this.log("Settings changed");
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
                        this.log("Ignore settings key: " + i + " " + settings.changedKeys[i]);
                        break;
                }
            }
            newSettings["units"] = this.homey.i18n.getUnits();
            newSettings["language"] = this.homey.i18n.getLanguage();    
            newSettings['lat'] = settings.newSettings['lat'];
            newSettings['lon'] = settings.newSettings['lon'];
            newSettings["APIKey"] = settings.newSettings["APIKey"];
            newSettings["days"] = settings.newSettings["days"];
            this.homey.clearInterval(this.pollinginterval);
            if (newSettings.pollingActive == true){
                this.setPollInterval(newSettings);
            }
        } catch (error) {
            throw error;
        }
    }

    // Flow action
    async updateDevice(){
        // Flow action for single update
        let settings = await this.getSettings();
        let newsettings = {};
        newsettings['lat'] = settings['lat'];
        newsettings['lon'] = settings['lon'];
        newsettings["APIKey"] = settings["APIKey"];
        newsettings["days"] = settings["days"];
        newsettings["units"] = this.homey.i18n.getUnits();
        newsettings["language"] = this.homey.i18n.getLanguage();
        this.pollWeatherData(newsettings);
    }
}
module.exports = owmOnecallDailySummary;