"use strict";
// need Homey module, see SDK Guidelines
const Homey = require('homey');
const weather = require('../../owm_api.js');

class owmOnecallAlertsDriver extends Homey.Driver {
    onPair(session) {
        this.log("onPair()");
        this.settingsData = {
            "location": ""
        };

        session.setHandler("list_devices", async () => {
            return await this.onPairListDevices(session);
        });
      
    } // end onPair

   /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
    async onPairListDevices(session) {
        this.log("onPairListDevices()" );
        let devices = [];
        let locations = this.homey.drivers.getDriver('owmOnecallCurrent').getDevices();
        for (let i=0; i<locations.length; i++){
            devices.push(
            {
                name: locations[i].getName() + " " + this.homey.__("pair.oneCallAPI.alert"),
                data: {
                    id: this.getUIID(),
                    locationId: locations[i].getData().id
                },
                settings:{
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
module.exports = owmOnecallAlertsDriver;
