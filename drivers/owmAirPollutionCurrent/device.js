'use strict';

const { throws } = require('assert');
const Homey = require('homey');
const owm = require('../../lib/owm_api.js');
const intervalCurrent = 5;

class owmAirPollutionCurrent extends Homey.Device {

    async onInit() {
        let name = this.getName() + '_' + this.getData().id;
        this.log('AirPollutionCurrent init: '+name);

        await this.updateCapabilities();

        // this.data = require('./data.js').DATA_DEF;
        this.data = 
        {
            "measure_forecast_time":{
            },
            "measure_ap_aqi":{
            },
            "measure_ap_pm10":{
            },
            "measure_ap_pm25":{
            },
            "measure_ap_no":{
            },
            "measure_ap_no2":{
            },
            "measure_ap_o3":{
            },
            "measure_ap_co":{
            },
            "measure_ap_so2":{
            },
            "measure_ap_nh3":{
            },
            "measure_ap_aqi_nr":{
            }
        }

        let settings = await this.getSettings();
        if (!settings.pollingInterval || settings.pollingInterval == 0){
            settings.pollingInterval = intervalCurrent;
            this.setSettings(settings);
        }

        // Flows
        // this._flowTriggerTemperatureChanged = this.homey.flow.getDeviceTriggerCard('TemperatureChanged');

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
        let id = this.getData().id;
        this.log('device added: ', id);

    } // end onAdded

    onDeleted() {
        this.homey.clearInterval(this.pollinginterval);
        this.log('device deleted:', this.getName(), this.getData().id);
        this.homey.app.setChildDevicesUnavailable(id);
    } // end onDeleted

    setPollInterval(settings) {
        //run once, then at interval
        this.pollWeatherData(settings);
        this.pollinginterval = this.homey.setInterval(
            () => this.pollWeatherData(settings).catch(error => console.log(error)),
            ( 60 * 1000 * settings.pollingInterval) );
    }

    async setDeviceUnavailable(message){
        try{
            await this.setUnavailable(message);
            let childList = this.homey.drivers.getDriver('owmAirPollutionHourly').getDevices();
            for (let i=0; i<childList.length; i++){
                if (childList[i].getData().locationId == this.getData().id){
                    await  childList[i].setUnavailable(this.homey.__("device_unavailable_reason.location_not_available"));
                }
            }
        }
        catch (error){
            this.log("Error setting device unavailable: ", error.message);
        }
    }

    async setDeviceAvailable(){
        if ( !this.getAvailable() ){
            try{
                await this.setAvailable();
                let childList = this.homey.drivers.getDriver('owmAirPollutionHourly').getDevices();
                for (let i=0; i<childList.length; i++){
                    if (childList[i].getData().locationId == this.getData().id){
                        await childList[i].setAvailable();
                    }
                }
            }
            catch (error){
                this.log("Error setting device available: ", error.message);
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

    async updateDevice(){
        // Flow action for single update
        let settings = await this.getSettings();
        let newsettings = {};
        newsettings['lat'] = settings['lat'];
        newsettings['lon'] = settings['lon'];
        newsettings["APIKey"] = settings["APIKey"];
        this.pollWeatherData(newsettings);
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
            let url = owm.getAirPollutionURL(settings);
            data = await owm.getWeatherData(url);
        }
        catch(error){
            this.log("Error reading OWM data:", error.message);
        }
        if (!data || !data.list){
            if (data && data.message && data.cod>200){
                this.log("API error message!");
                this.log(data);
                this.setDeviceUnavailable(data.message);
                return;
            }
            else{
                this.log("No air pollution data found!");
                this.setDeviceUnavailable(this.homey.__("device_unavailable_reason.no_api_result"));
                return;
            }
        }
        else{
            this.setDeviceAvailable();
        }

        this.log(this.getName(), this.getData().id, " Received OWM data");

        let tz  = this.homey.clock.getTimezone();
        let forecast_time;
        let lastUpdate;
        let hasDateLocalization = this.homey.app.hasDateLocalization();
        if (hasDateLocalization){
            let now = new Date(data.list[0].dt*1000).toLocaleString(this.homey.i18n.getLanguage(), 
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
            lastUpdate = now.replace(',', '');
        }
        else{
            let now = new Date(data.list[0].dt*1000).toLocaleString('de-DE', 
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

            now = new Date().toLocaleString('de-DE', 
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
                    
        this.getDataCapability('measure_forecast_time')['value'] = forecast_time;

        this.getDataCapability('measure_ap_pm10')['value'] = data.list[0].components.pm10;
        this.getDataCapability('measure_ap_pm25')['value'] = data.list[0].components.pm2_5;
        this.getDataCapability('measure_ap_no')['value'] = data.list[0].components.no;
        this.getDataCapability('measure_ap_no2')['value'] = data.list[0].components.no2;
        this.getDataCapability('measure_ap_o3')['value'] = data.list[0].components.o3;
        this.getDataCapability('measure_ap_co')['value'] = data.list[0].components.co;
        this.getDataCapability('measure_ap_so2')['value'] = data.list[0].components.so2;
        this.getDataCapability('measure_ap_nh3')['value'] = data.list[0].components.nh3;
        this.getDataCapability('measure_ap_aqi')['value'] = data.list[0].main.aqi.toString();
        if (data.list[0].main.aqi < 1  || data.list[0].main.aqi > 5){
            this.getDataCapability('measure_ap_aqi_nr')['value'] = undefined; 
        }
        else{   
            this.getDataCapability('measure_ap_aqi_nr')['value'] = data.list[0].main.aqi;
        }

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
 
        // Update Hourly/daily
        await this.updateChildHourly(data)
    }

    async updateChildHourly(data){
        let devices = this.homey.drivers.getDriver('owmAirPollutionHourly').getDevices();
        for (let i=0; i<devices.length; i++){
            if (devices[i].getData().locationId == this.getData().id){
                devices[i].updateDevice(data)
            }
        }
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
                    default:
                        this.log("Ignore settings key: " + i + " " + settings.changedKeys[i]);
                        break;
                }
            }
            this.homey.clearInterval(this.pollinginterval);
            if (newSettings.pollingActive == true){
                this.setPollInterval(newSettings);
            }
        } catch (error) {
            throw error;
        }
    }
}
module.exports = owmAirPollutionCurrent;