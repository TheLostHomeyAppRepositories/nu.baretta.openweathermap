"use strict";
// need Homey module, see SDK Guidelines
const Homey = require('homey');
const owm = require('../../lib/owm_api.js');
// const crypto = require('crypto');

class owmAirPollutionCurrentDriver extends Homey.Driver {

    getExistingAPIKey(){
        let devices = this.homey.drivers.getDriver('owmAirPollutionCurrent').getDevices();
        for (let i=0; i<devices.length; i++){
            if (devices[i].getSettings('APIKey')){
                return devices[i].getSetting('APIKey');
            }
        }
        devices = this.homey.drivers.getDriver('owmOnecallCurrent').getDevices();
        for (let i=0; i<devices.length; i++){
            if (devices[i].getSettings('APIKey')){
                return devices[i].getSetting('APIKey');
            }
        }
        devices = this.homey.drivers.getDriver('owmCurrent').getDevices();
        for (let i=0; i<devices.length; i++){
            if (devices[i].getSettings('APIKey')){
                return devices[i].getSetting('APIKey');
            }
        }
        return "";
    }

    onPair(session) {
        this.log("onPair()");
        // search for a existing API key to preset it in the pairing dialog
        
        let apiKey = this.getExistingAPIKey();
  
        this.settingsData = {
            "APIKey": apiKey,
            "GEOlocationCity": "",
            "pollingInterval": 60
        };

        session.setHandler("list_devices", async () => {
            return await this.onPairListDevices(session);
        });
      
        session.setHandler("settingsChanged", async (data) => {
            return await this.onSettingsChanged(data);
        });

        session.setHandler("getCityList", async (query) => {
            return await this.onGetCityList(query);
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

    async onGetCityList(query){
        // Check APIKey with a call without city
        let cities = [];
        let url = owm.getGeocodeURL(this.settingsData);
        try{
            let geoData = await owm.getWeatherData(url);
            if (!geoData || geoData.cod == 401){
                return [];
            }
            for (let i=0; i<geoData.length; i++){
                let name = geoData[i].name;
                if (geoData[i].state != undefined){
                    name = name + ',' + geoData[i].state;
                    if (geoData[i].country != undefined){
                        name = name + ',' + geoData[i].country;
                    }
                }
                let city = {
                    nameComplete: name, 
                    name: geoData[i].name,
                    country: geoData[i].country,
                    state: geoData[i].state
                }
                cities.push(city);
            }
            return cities;
        }
        catch(error){
            return [];
        }        
    }

   /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
    async onPairListDevices(session) {
        this.log("onPairListDevices()" );
        let devices = [];

        if (!this.settingsData.APIKey){
            await session.showView("apikey_error");
        }

        if (!this.settingsData.GEOlocationCity){
            // no city defined. Use Homey location
            this.settingsData["lat"] = await this.homey.geolocation.getLatitude();
            this.settingsData["lon"] = await this.homey.geolocation.getLongitude();
            if (!this.settingsData["lat"] || !this.settingsData["lon"]){
                await session.showView("geolocation_error");
                return;
            }
            // Check APIKey with a call without city
            let url = await owm.getGeocodeURL(this.settingsData);
            try{
                let geoData = await owm.getWeatherData(url);
                if (!geoData || geoData.cod == 401){
                    await session.showView("apikey_error");
                }
            }
            catch(error){
                throw error;
            }
            let deviceName = "Lat:" + this.settingsData["lat"] + ' Lon:' + this.settingsData["lon"];
            //let deviceId = crypto.randomBytes(16).toString('hex');
            let deviceId = this.getUIID();
            let device = {
                name: deviceName,
                data: {
                  id: deviceId
                },
                capabilities: [],
                settings:{
                    APIKey: this.settingsData["APIKey"],
                    lat: this.settingsData["lat"],
                    lon: this.settingsData["lon"],
                    pollingInterval: this.settingsData["pollingInterval"]
                }
            };
            devices.push(device);
        }
        else{
            let url = owm.getGeocodeURL(this.settingsData);
            try{
                let geoData = await owm.getWeatherData(url);
                if (!geoData || geoData.cod == 401){
                    await session.showView("apikey_error");
                }
                for (let i=0; i<geoData.length; i++){
                    let deviceName = geoData[i].name+', '+geoData[i].country+', '+geoData[i].state;
                    // let deviceId = crypto.randomBytes(16).toString('hex');
                    let deviceId = this.getUIID();
                    let device = {
                        name: deviceName,
                        data: {
                          id: deviceId
                        },
                        capabilkities: [],
                        settings:{
                            APIKey: this.settingsData["APIKey"],
                            lat: geoData[i].lat,
                            lon: geoData[i].lon,
                            pollingInterval: this.settingsData["pollingInterval"],
                            pollingActive: true
                        }
                    };
                    devices.push(device);
                }
                
            }
            catch(error){
                throw error;
            }
        }
        this.log("Found devices:");
        this.log(devices);
        if (devices.length == 0){
            await session.showView("geolocation_error");
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
module.exports = owmAirPollutionCurrentDriver;
