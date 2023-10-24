'use strict';

const Homey = require('homey');

class owmAirPollutionHourly extends Homey.Device {

    async onInit() {
        this.log('OnecallHourly init: ', this.getName(), this.getData().id);

        await this.updateCapabilities();

        await this.checkParentDevice();
        // // Intervall to check parent device is still existing
        // this.checkParentInterval = this.homey.setInterval(_ => {
        //     this.checkParentDevice()
        // }, 60 * 1000 * 2);

        // this.data = require('./data.js').DATA_DEF;
        this.data = {
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
        let deviceList = this.homey.drivers.getDriver('owmAirPollutionCurrent').getDevices();
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
        this.log('device added: ',  this.getName(), this.getData().id);
    } // end onAdded

    onDeleted() {
        this.homey.clearInterval(this.checkParentInterval);
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

    getDataCapability(capability){
        if (this.data == undefined){
            throw new Error("Device definition not found.");
        }
        if (this.data[capability] == undefined){
            throw new Error("Device definition not found for capability: "+capability);
        }
        return this.data[capability];
    }

    async updateDevice(hourlyData){
        if (this.data == undefined){
            this.log("No data definition found.");
            this.setDeviceUnavailable(this.homey.__("device_unavailable_reason.no_definition"));
            return;
        }
        let dataKeys = Object.keys(this.data);

        this.log(this.getName(), this.getData().id, " Received AirPollution hourly data");

        let hours = parseInt(this.getSetting("hours"));
        if (hours == null || hours < 0 || hours > 96){
            return;
        }
        if (hours == ''){
            hours = 0;
        }
        this.log("Hourly period: "+hours);
        let data = hourlyData.list[hours];
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
            forecast_time = now.replace(',', '');
        }
        else{
            let now = new Date(data.dt*1000).toLocaleString('de-DE', 
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

        this.getDataCapability('measure_forecast_time')['value'] = forecast_time;

        this.getDataCapability('measure_ap_pm10')['value'] = data.components.pm10;
        this.getDataCapability('measure_ap_pm25')['value'] = data.components.pm2_5;
        this.getDataCapability('measure_ap_no')['value'] = data.components.no;
        this.getDataCapability('measure_ap_no2')['value'] = data.components.no2;
        this.getDataCapability('measure_ap_o3')['value'] = data.components.o3;
        this.getDataCapability('measure_ap_co')['value'] = data.components.co;
        this.getDataCapability('measure_ap_so2')['value'] = data.components.so2;
        this.getDataCapability('measure_ap_nh3')['value'] = data.components.nh3;
        this.getDataCapability('measure_ap_aqi')['value'] = data.main.aqi.toString();
        if (data.main.aqi < 1  || data.main.aqi > 5){
            this.getDataCapability('measure_ap_aqi_nr')['value'] = undefined; 
        }
        else{   
            this.getDataCapability('measure_ap_aqi_nr')['value'] = data.main.aqi;
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
    }

    // parameters: {settings, newSettingsObj, changedKeysArr}
    onSettings(settings) {
        try {
            for (let i = 0; i < settings.changedKeys.length; i++) {
                switch (settings.changedKeys[i]) {
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
        } catch (error) {
            throw error;
        }
    }

}
module.exports = owmAirPollutionHourly;