const DATA_DEF = {
    "forecast_time":{
    },
    "description":{
        "trigger": "WeatherChanged"
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
    "measure_dew_point":{
        "trigger": "DewPointChanged"
    },
    "measure_humidity":{
        "trigger": "HumidityChanged"
    },
    "measure_pop":{
        "trigger": "PopChanged"
    },
    "measure_cloudiness":{
        "trigger": "CloudinessChanged"
    },
    "measure_wind_combined":{
        "trigger": "WindCombinedChanged"
    },
    "measure_wind_strength":{
        "trigger": "WindStrengthChanged"
    },
    "measure_wind_gust":{
        "trigger": "WindGustChanged"
    },
    "measure_pressure":{
        "trigger": "PressureChanged"
    },
    "measure_rain":{
        "trigger": "RainChanged"
    },
    "measure_snow":{
        "trigger": "SnowChanged"
    },
    "sunrise":{
        "trigger": "SunriseChanged"
    },
    "sunset":{
        "trigger": "SunsetChanged"
    },
    "moonrise":{
        "trigger": "MoonriseChanged"
    },
    "moonset":{
        "trigger": "MoonsetChanged"
    },
    "moonphase_type":{
        "trigger": "MoonphaseChanged",
        "trigger_token": []
    },
    "measure_ultraviolet":{
        "trigger": "UltravioletChanged"
    },
    "conditioncode":{
        "trigger": "ConditionChanged"
    },
    "conditioncode_detail":{
        "trigger": "ConditionDetailChanged",
        "trigger_token": []
    },
    "measure_wind_angle":{
        "trigger": "WindAngleChanged"
    },
    "measure_wind_direction_string":{
        "trigger": "WindDirectionCompassChanged"
    },
    "measure_windstrength_beaufort":{
        "trigger": "WindBeaufortChanged"
    },
    "conditioncode_text":{
    }
}

module.exports = { DATA_DEF }