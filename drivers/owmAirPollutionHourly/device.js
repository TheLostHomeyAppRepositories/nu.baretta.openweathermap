'use strict';

const Homey = require('homey');

class owmAirPollutionHourly extends Homey.Device {

    async onInit() {
        let name = this.getName() + '_' + this.getData().id;
        this.log('OnecallHourly init: '+name);

        await this.updateCapabilities();
        await this.checkParentDevice();
    } // end onInit

    async updateCapabilities(){
        // add new capabilities
        // if (!this.hasCapability('measure_temperature_feelslike')){
        //     await this.addCapability('measure_temperature_feelslike');
        // }
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
        this.log(this.getData().id +" Received AirPollution hourly data");

        let device = this;

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
        // let tz  = this.homey.clock.getTimezone();
        // let now = new Date(data.dt*1000).toLocaleString('de-DE', 
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

        let ap_aqi = data.main.aqi.toString();
        let ap_aqi_nr = data.main.aqi;
        let ap_pm10 = data.components.pm10;
        let ap_pm25 = data.components.pm2_5;
        let ap_no = data.components.no;
        let ap_no2 = data.components.no2;
        let ap_o3 = data.components.o3;
        let ap_co = data.components.co;
        let ap_so2 = data.components.so2;
        let ap_nh3 = data.components.nh3;

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

        let capabilities = this.getCapabilities();
        for (let capability of capabilities) {
            this.log("Capability: " + capability + ":" + capabilitySet[capability]);
            if (capabilitySet[capability] != undefined) {
                await this.setCapabilityValue(capability, capabilitySet[capability]).catch(err => this.log(err.message));
            } else {
                this.log("Capability undefined: " + capability)
            }
        };

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
                        this.log("Key not matched: " + i);
                        break;
                }
            }
        } catch (error) {
            throw error;
        }
    }

}
module.exports = owmAirPollutionHourly;