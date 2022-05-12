'use strict';

const { throws } = require('assert');
const Homey = require('homey');
const weather = require('../../owm_api.js');
const intervalCurrent = 5;

class owmAirPollutionCurrent extends Homey.Device {

    async onInit() {
        let name = this.getName() + '_' + this.getData().id;
        this.log('AirPollutionCurrent init: '+name);

        await this.updateCapabilities();

        let settings = await this.getSettings();
        if (!settings.pollingInterval || settings.pollingInterval == 0){
            settings.pollingInterval = intervalCurrent;
            this.setSettings(settings);
        }

        // Flows
        // this._flowTriggerTemperatureChanged = this.homey.flow.getDeviceTriggerCard('TemperatureChanged');

        //run once to get the first data
        if (settings.pollingActive == true){
            this.pollAirPollution(settings);
        }
    } // end onInit

    async updateCapabilities(){
        // add new capabilities

    }

    onAdded() {
        let id = this.getData().id;
        this.log('device added: ', id);

    } // end onAdded

    onDeleted() {

        let id = this.getData().id;
        clearInterval(this.pollingintervalcurrent);
        this.log('device deleted:', id);

        this.homey.app.setChildDevicesUnavailable(id);
    } // end onDeleted

    pollAirPollution(settings) {
        //run once, then at interval

        this.pollingintervalcurrent = weather.setIntervalImmediately(_ => {
            this.pollOpenWeatherMapAirPollution(settings)
        }, 60 * 1000 * settings.pollingInterval);
    }

    async setDeviceUnavailable(message){
        this.setUnavailable(message);
        // let childList = this.homey.drivers.getDriver('owmAirPollutionHourly').getDevices();
        // for (let i=0; i<childList.length; i++){
        //     if (childList[i].getData().locationId == this.getData().id){
        //         childList[i].setUnavailable(this.homey.__("device_unavailable_reason.location_not_available"));
        //     }
        // }
    }

    async setDeviceAvailable(){
        if ( !this.getAvailable() ){
            await this.setAvailable();
            // let childList = this.homey.drivers.getDriver('owmAirPollutionHourly').getDevices();
            // for (let i=0; i<childList.length; i++){
            //     if (childList[i].getData().locationId == this.getData().id){
            //         childList[i].setAvailable();
            //     }
            // }
        }
    }

    async updateDevice(){
        // Flow action for single update
        let settings = await this.getSettings();
        let newsettings = {};
        newsettings['lat'] = settings['lat'];
        newsettings['lon'] = settings['lon'];
        newsettings["APIKey"] = settings["APIKey"];
        this.pollOpenWeatherMapAirPollution(newsettings);
    }

    async pollOpenWeatherMapAirPollution(settings) {

        weather.getURLAirPollution(settings).then(url => {
                //this.log("OnCall-URL: "+url);
                return weather.getWeatherData(url);
            })
            .then(async (data) => {
                // this.log("Result:");
                // this.log(data);
                if (!data.list){
                    if (data.message && data.cod>200){
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
                let device = this;
                // let triggerList = [];
                this.log(device.getData().id +" Received OWM data");

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
                    lastUpdate = 'Last update: ' + now.replace(',', '');
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
                    lastUpdate = 'Last update: ' + date + " " + time;
                }
                // //var GEOlocation = "Lat:" + data.lat + " Lon:" +data.lon;
                // // var GEOlocation = this.getName();
                // let tz  = this.homey.clock.getTimezone();

                // let now = new Date(data.list[0].dt*1000).toLocaleString('de-DE', 
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
                // let forecast_time = date + " " + time;

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

                this.setSettings({
                    "APIState": lastUpdate
                    })
                    .catch(this.error);
                    
                let ap_aqi = data.list[0].main.aqi.toString();
                let ap_aqi_nr = data.list[0].main.aqi;
                let ap_pm10 = data.list[0].components.pm10;
                let ap_pm25 = data.list[0].components.pm2_5;
                let ap_no = data.list[0].components.no;
                let ap_no2 = data.list[0].components.no2;
                let ap_o3 = data.list[0].components.o3;
                let ap_co = data.list[0].components.co;
                let ap_so2 = data.list[0].components.so2;
                let ap_nh3 = data.list[0].components.nh3;

                this.log("Comparing variables before and after current polling interval");

                // if (this.getCapabilityValue('measure_temperature') !== temp && temp !== undefined) {
                //     this.log("Temp. previous: " + this.getCapabilityValue('measure_temperature') );
                //     this.log("Temp. new: " + temp );
                //     let state = {
                //         "measure_temperature": temp
                //     };
                //     let tokens = {
                //         "measure_temperature": temp,
                //         "location": GEOlocation
                //     };
                //     triggerList.push({'trigger':this._flowTriggerTemperatureChanged, 'device':device, 'token':tokens, 'state':state});
                //     // this._flowTriggerTemperatureChanged.trigger(device, tokens, state).catch(this.error)
                // }

                
                // update each interval, even if unchanged.
                const capabilitySet = {
                    'measure_ap_pm10': ap_pm10,
                    'measure_ap_pm25': ap_pm25,
                    'measure_ap_no': ap_no,
                    'measure_ap_no2': ap_no2,
                    'measure_ap_o3': ap_o3,
                    'measure_ap_co': ap_co,
                    'measure_ap_so2': ap_so2,
                    'measure_ap_nh3': ap_nh3,
                    'measure_ap_aqi': ap_aqi,
                    'measure_ap_aqi_nr': ap_aqi_nr,
                    'measure_forecast_time': forecast_time
                };

                this.getCapabilities().forEach(async capability => {
                    this.log("Capability: " + capability + ":" + capabilitySet[capability]);
                    if (capabilitySet[capability] != undefined) {
                        await this.setCapabilityValue(capability, capabilitySet[capability])
                            .catch(err => this.log(err));
                    } else {
                        this.log("Capability undefined: " + capability)
                    }
                });
        
                // this.log("Trigger Flows...")
                // for (let i=0; i<triggerList.length; i++){
                //     triggerList[i].trigger.trigger(triggerList[i].device, triggerList[i].token, triggerList[i].state);
                // }

                // Update Hourly/daily
                await this.updateChildHourly(data)
            })
            .catch(error => {
                this.log(error);
            });
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
                        this.log("Key not matched: " + i);
                        break;
                }
            }
            clearInterval(this.pollingintervalcurrent);
            if (newSettings.pollingActive == true){
                this.pollAirPollution(newSettings);
            }
        } catch (error) {
            throw error;
        }
    }
}
module.exports = owmAirPollutionCurrent;