"use strict";
// need Homey module, see SDK Guidelines
const Homey = require('homey');
const weather = require('../../owm_api.js');

class owmOnecallDailyDriver extends Homey.Driver {
    onPair(session) {
        this.log("onPair()");
        this.settingsData = {
            "days": "0",
            "location": ""
        };

        session.setHandler("list_devices", async () => {
            return await this.onPairListDevices(session);
        });
      
        session.setHandler("settingsChanged", async (data) => {
            return await this.onSettingsChanged(data);
        });

        session.setHandler("getSettings", async () => {
            this.log("getSettings: ");
            this.log(this.settingsData);
            return this.settingsData;
        });

    } // end onPair

    /**
   * Selects the number of entires fitting the name set in the pair dialog
   * @param {*} name Name (part) of city/district
   * @returns Number of found entries
   */
    async onSettingsChanged(data){
        this.log("Event settingsChanged: ");
        this.log(data);
        this.settingsData = data;
        return true;
    }

   /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
    async onPairListDevices(session) {
        this.log("onPairListDevices()" );
        let devices = [];
        if (!this.settingsData.days){
            this.settingsData.days = 0;
        }
        let locations = this.homey.drivers.getDriver('owmOnecallCurrent').getDevices();
        for (let i=0; i<locations.length; i++){
            devices.push(
            {
                name: locations[i].getName() + " +" + this.settingsData.days + "d",
                data: {
                    id: this.getUIID(),
                    locationId: locations[i].getData().id
                },
                settings:{
                    days: parseInt(this.settingsData.days),
                    location: locations[i].getName()
                }
            }
            );
        }

        this.log("Found devices:");
        this.log(devices);
        if (devices.length == 0){
            await session.showView("location_error");
            return;
        }
        return devices;
    }

    getUIID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }
        return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
    }

}
module.exports = owmOnecallDailyDriver;
