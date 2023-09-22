if (process.env.DEBUG === '1')
{
    require('inspector').open(9230, '0.0.0.0', true);
}

'use strict';

const Homey = require('homey');

class openWeatherMap extends Homey.App {
    /**
     * onInit is called when the app is initialized.
     */
    async onInit() {
      this.log('OpenWeatherMap has been initialized');
      // app settings stores in class attribute
      this.settings = {};
  
      // read app settings
      await this.readSettings();
      
      // Register settings listener
      this.homey.settings.on('set', async (key) => {
          if (key === 'settings')
          {
            await this.readSettings();
          }
      });

      // Check Homey version for date conversion
      let version = this.homey.version;
      let versionArray = version.split(".");
      if ( (versionArray[0] > 7) || (versionArray[0] == 7 && versionArray[1] >= 4)){
        this.dateLocalization = true;
      }
      else{
        this.dateLocalization = false;
      }

      // Register Flow Condition-Listener
      this._conditioncodeCondition = this.homey.flow.getConditionCard('Conditioncode')
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('conditioncode') == args.argument_main);
      })

      this._conditioncodeDetailCondition = this.homey.flow.getConditionCard('Conditioncode_detail')
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('conditioncode_detail') == args.argument_main);
      })

      this._tempCondition = this.homey.flow.getConditionCard("Temp")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_temperature') > args.degrees);
      })

      this._tempeveCondition = this.homey.flow.getConditionCard("Tempeve")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_temperature_evening') > args.degrees);
      })

      this._tempfeelslikeCondition= this.homey.flow.getConditionCard("Tempfeelslike")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_temperature_feelslike') > args.degrees);
      })

      this._tempmaxCondition = this.homey.flow.getConditionCard("Tempmax")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_temperature_max') > args.degrees);
      })

      this._tempminCondition = this.homey.flow.getConditionCard("Tempmin")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_temperature_min') > args.degrees);
      })

      this._tempmornCondition = this.homey.flow.getConditionCard("Tempmorn")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_temperature_morning') > args.degrees);
      })

      this._tempdayCondition = this.homey.flow.getConditionCard("Tempday")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_temperature_day') > args.degrees);
      })

      this._tempnightCondition = this.homey.flow.getConditionCard("Tempnight")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_temperature_night') > args.degrees);
      })

      this._cloudsCondition = this.homey.flow.getConditionCard("Clouds")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_cloudiness') > args.cloudiness);
      })

      this._humidityCondition = this.homey.flow.getConditionCard("Humidity")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_humidity') > args.humidity);
      })

      this._pressureCondition = this.homey.flow.getConditionCard("Pressure")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_pressure') > args.bar);
      })

      this._dewPointCondition = this.homey.flow.getConditionCard("DewPoint")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_dew_point') > args.degrees);
      })

      this._winddirectionCondition = this.homey.flow.getConditionCard("Winddirection")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_wind_direction_string') == args.winddirection);
      })

      this._windforceCondition = this.homey.flow.getConditionCard("Windforce")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_windstrength_beaufort') > args.windforce);
      })

      this._windspeedCondition = this.homey.flow.getConditionCard("Windspeed")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_wind_strength') > args.windspeed);
      })

      this._windgustCondition = this.homey.flow.getConditionCard("Windgust")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_wind_gust') > args.windgust);
      })

      this._visibilityCondition = this.homey.flow.getConditionCard("Visibility")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_visibility') > args.visibility);
      })

      this._snowCondition = this.homey.flow.getConditionCard("Snow")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_snow') > args.snow);
      })

      this._rainCondition = this.homey.flow.getConditionCard("Rain")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_rain') > args.rain);
      })

      this._popCondition = this.homey.flow.getConditionCard("Pop")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_pop') > args.pop);
      })

      this._moonphaseCondition = this.homey.flow.getConditionCard("Moonphase")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('moonphase') > args.moonphase);
      })

      this._moonphaseTypeCondition = this.homey.flow.getConditionCard("Moonphase_type")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('moonphase_type') == args.moonphase_type);
      })

      // Flow Conditions for AirPollution devices 
      this._measure_ap_aqi_nrCondition = this.homey.flow.getConditionCard("measure_ap_aqi_nr")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_ap_aqi_nr') > args.value);
      })
      this._measure_ap_coCondition = this.homey.flow.getConditionCard("measure_ap_co")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_ap_co') > args.value);
      })
      this._measure_ap_nh3Condition = this.homey.flow.getConditionCard("measure_ap_nh3")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_ap_nh3') > args.value);
      })
      this._measure_ap_noCondition = this.homey.flow.getConditionCard("measure_ap_no")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_ap_no') > args.value);
      })
      this._measure_ap_no2Condition = this.homey.flow.getConditionCard("measure_ap_no2")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_ap_no2') > args.value);
      })
      this._measure_ap_o3Condition = this.homey.flow.getConditionCard("measure_ap_o3")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_ap_o3') > args.value);
      })
      this._measure_ap_pm10Condition = this.homey.flow.getConditionCard("measure_ap_pm10")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_ap_pm10') > args.value);
      })
      this._measure_ap_pm25Condition = this.homey.flow.getConditionCard("measure_ap_pm25")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_ap_pm25') > args.value);
      })
      this._measure_ap_so2Condition = this.homey.flow.getConditionCard("measure_ap_so2")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_ap_so2') > args.value);
      })

      // Flow Conditions for Alerts devices 
      this._measure_number_of_warningsCondition = this.homey.flow.getConditionCard("measure_number_of_warnings")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('measure_number_of_warnings') > args.value);
      })
      this._measure_alarm_warningsCondition = this.homey.flow.getConditionCard("alarm_warnings")
      .registerRunListener(async (args, state) => {
        return (args.device.getCapabilityValue('alarm_warnings'));
      })

      // Register Flow-Action-Listener
      // Single device update for OWM-current and AirPollutionCurrent 
      this._flowActionUpdateDevice = this.homey.flow.getActionCard('update_device');
      this._flowActionUpdateDevice.registerRunListener(async (args, state) => {
            return args.device.updateDevice();
      });

    }

    async readSettings(){
      this.settings = await this.homey.settings.get('settings');
      if (this.settings){
      }
      else
      {
      }
    }

    hasDateLocalization(){
      return this.dateLocalization;
    }

    getConditioncodeText(conditioncode){
      let condlist = this.manifest.capabilities.conditioncode.values;
      let cond = condlist.find(cond => cond.id == conditioncode);
      let lang = this.homey.i18n.getLanguage();
      let condText = "";
      if (cond.title[lang]){
        condText = cond.title[lang];
      }
      return condText;
    }

    async setChildDevicesUnavailable(id){
      let childList = this.homey.drivers.getDriver('owmOnecallHourly').getDevices();
      for (let i=0; i<childList.length; i++){
        try{
          if (childList[i].getData().locationId == id){
              childList[i].setUnavailable(this.homey.__("device_unavailable_reason.location_not_available"));
          }
        }
        catch(error){this.error("setChildDevicesUnavailable(): Device not found: LocationID ", id)}
      }
      childList = this.homey.drivers.getDriver('owmOnecallDaily').getDevices();
      for (let i=0; i<childList.length; i++){
        try{
          if (childList[i].getData().locationId == id){
              childList[i].setUnavailable(this.homey.__("device_unavailable_reason.location_not_available"));
          }
        }
        catch(error){this.error("setChildDevicesUnavailable(): Device not found: LocationID ", id)}
      }
      childList = this.homey.drivers.getDriver('owmOnecallAlerts').getDevices();
      for (let i=0; i<childList.length; i++){
        try{
          if (childList[i].getData().locationId == id){
              childList[i].setUnavailable(this.homey.__("device_unavailable_reason.location_not_available"));
          }
        }
        catch(error){this.error("setChildDevicesUnavailable(): Device not found: LocationID ", id)}
      }

    }

}

module.exports = openWeatherMap;