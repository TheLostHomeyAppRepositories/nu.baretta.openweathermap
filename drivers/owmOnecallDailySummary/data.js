const DATA_DEF = {
    "forecast_time":{
    },

    "measure_temperature_min":{
        "trigger": "TemperatureMinChanged"
    },
    "measure_temperature_max":{
        "trigger": "TemperatureMaxChanged"
    },
    "measure_temperature_morning":{
        "trigger": "TemperatureMorningChanged"
    },
    "measure_temperature_day":{
        "trigger": "TemperatureDayChanged"
    },
    "measure_temperature_evening":{
        "trigger": "TemperatureEveningChanged"
    },
    "measure_temperature_night":{
        "trigger": "TemperatureNightChanged"
    },

    "measure_humidity":{
        "trigger": "HumidityChanged"
    },
    "measure_cloudiness":{
        "trigger": "CloudinessChanged"
    },
    "measure_pressure":{
        "trigger": "PressureChanged"
    },
    "measure_rain":{
        "trigger": "RainChanged"
    },


    "measure_wind_combined":{
        "trigger": "WindCombinedChanged"
    },
    "measure_wind_strength":{
        "trigger": "WindStrengthChanged"
    },
    "measure_wind_angle":{
        "trigger": "WindAngleChanged"
    },
    "measure_wind_direction_string":{
        "trigger": "WindDirectionCompassChanged"
    },
    "measure_windstrength_beaufort":{
        "trigger": "WindBeaufortChanged"
    }
}

module.exports = { DATA_DEF }