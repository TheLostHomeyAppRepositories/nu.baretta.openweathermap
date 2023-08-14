const DATA_DEF = {
    "forecast_time":{
    },
    "description":{
        "trigger": "WeatherChanged"
    },
    "measure_temperature":{
        "trigger": "TemperatureChanged"
    },
    "measure_temperature_feelslike":{
        "trigger": "TemperatureFeelslikeChanged"
    },
    "measure_dew_point":{
        "trigger": "DewPointChanged"
    },
    "measure_humidity":{
        "trigger": "HumidityChanged"
    },
    "measure_cloudiness":{
        "trigger": "CloudinessChanged"
    },
    "measure_visibility":{
        "trigger": "VisibilityChanged"
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