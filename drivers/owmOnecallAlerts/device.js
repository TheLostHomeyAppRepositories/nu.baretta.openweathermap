'use strict';

const Homey = require('homey');
const crypto = require('crypto');

class owmOnecallAlerts extends Homey.Device {

    async onInit() {
        this.log('OnecallAlerts init: ', this.getName(), this.getData().id);

        await this.updateCapabilities();
        await this.checkParentDevice();
        // // Intervall to check parent device is still existing
        // this.checkParentInterval = this.homey.setInterval(_ => {
        //     this.checkParentDevice()
        // }, 60 * 1000 * 2);
    } // end onInit

    async updateCapabilities(){
        // add new capabilities
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
        this.log('device added: ', this.getName(), this.getData().id);
    } // end onAdded

    onDeleted() {
        this.homey.clearInterval(this.checkParentInterval);
        this.log('device deleted:', this.getName(), this.getData().id);
    } // end onDeleted

    async setDeviceUnavailable(message){
        await this.setUnavailable(message);
    }

    async setDeviceAvailable(){
        if ( !this.getAvailable() ){
            await this.setAvailable();
        }
    }

    async updateDevice(alerts){
        this.log(this.getName() +" Received OWM alert data");

        // Update alarm capabilities 1..5
        for(let i=0; i<5; i++){
            if (i < alerts.length){
                await this.updateAlert(i, alerts[i])
            }
            else{
                await this.clearAlert(i);
            }
        }

        // Set number of warnings capability
        let numberOfWarnings = alerts.length;
        await this.setCapabilityValue("measure_number_of_warnings", numberOfWarnings);        

        // Set alarm capability
        let alarm = false;
        if (alerts.length > 0){
            alarm = true;
        }
        await this.setCapabilityValue("alarm_warnings", alarm);        

        // Alerts has value (to check for changed content)
        let hash = crypto.createHash('sha1').update(JSON.stringify(alerts)).digest('base64').toString();
        await this.setCapabilityValue("warnings_hash", hash);        
        
    }

    async updateAlert(index, alert){
        // let language = this.homey.i18n.getLanguage();
        let GEOlocation = this.getName();

        let tz  = this.homey.clock.getTimezone();
        let hasDateLocalization = this.homey.app.hasDateLocalization();
        let start;
        if (hasDateLocalization){
            let now = new Date(alert.start*1000).toLocaleString(this.homey.i18n.getLanguage(), 
            { 
                hour12: false, 
                timeZone: tz,
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
            start = now.replace(',', '');;
        }
        else{
            let now = new Date(alert.start*1000).toLocaleString('en-US', 
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
            start = date + " " + time;
        }
        let end;
        if (hasDateLocalization){
            let now = new Date(alert.end*1000).toLocaleString(this.homey.i18n.getLanguage(), 
            { 
                hour12: false, 
                timeZone: tz,
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
            end = now.replace(',', '');;
        }
        else{
            let now = new Date(alert.end*1000).toLocaleString('en-US', 
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
            end = date + " " + time;
        }

        let event = alert.event;
        let description = alert.description;
        let tags = '';
        for (let i=0; i<alert.tags.length; i++){
            if (i>0){
                tags = tags + ', ';
            }
            tags = tags + alert.tags[i];
        }

        let index_str = (index+1).toString();
        if (index_str.length < 2){
            index_str = "0" + index_str;
        }
        await this.setCapabilityValue("warnings_"+index_str+"_start", start).catch(error => {});
        await this.setCapabilityValue("warnings_"+index_str+"_end", end).catch(error => {});
        await this.setCapabilityValue("warnings_"+index_str+"_event", event).catch(error => {});
        await this.setCapabilityValue("warnings_"+index_str+"_tags", tags).catch(error => {});
        await this.setCapabilityValue("warnings_"+index_str+"_description", description).catch(error => {});

    }

    async clearAlert(index){
        let index_str = (index+1).toString();
        if (index_str.length < 2){
            index_str = "0" + index_str;
        }
        await this.setCapabilityValue("warnings_"+index_str+"_start", "").catch(error => {});
        await this.setCapabilityValue("warnings_"+index_str+"_end", "").catch(error => {});
        await this.setCapabilityValue("warnings_"+index_str+"_event", "").catch(error => {});
        await this.setCapabilityValue("warnings_"+index_str+"_tags", "").catch(error => {});
        await this.setCapabilityValue("warnings_"+index_str+"_description", "").catch(error => {});
    }

    // parameters: {settings, newSettingsObj, changedKeysArr}
    onSettings(settings) {
    }

}
module.exports = owmOnecallAlerts;