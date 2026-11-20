import { useEffect, useState } from "react";

import {
  Sun,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudLightning,
  CloudSnow,
  Wind,
  Droplets,
  Eye,
  Gauge,
  Sunrise,
  Sunset,
  MapPin,
  Search,
  Umbrella,
  Moon,
  CloudDrizzle,
  Thermometer,
  Navigation,
  LoaderCircle,
  ChevronDown
} from "lucide-react";

import './App.css'

const DEFAULT_LOCATION = {
  name: "Harrisburg",
  admin1: "Pennsylvania",
  country: "United States",
  latitude: 40.2732,
  longitude: -76.8867
};

function getWeatherDescription(code) {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([56, 57].includes(code)) return "Freezing Drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([66, 67].includes(code)) return "Freezing Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain Showers";
  if ([85, 86].includes(code)) return "Snow Showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";

  return "Unknown Conditions";
}

function WeatherIcon({ code, isDay = true, size = 30 }) {
  let Icon = Cloud;

  if (code === 0) {
    Icon = isDay ? Sun : Moon;
  } else if ([1, 2].includes(code)) {
    Icon = isDay ? CloudSun : CloudMoon;
  } else if ([45, 48, 3].includes(code)) {
    Icon = Cloud;
  } else if ([51, 53, 55, 56, 57].includes(code)) {
    Icon = CloudDrizzle;
  } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    Icon = CloudRain;
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    Icon = CloudSnow;
  } else if ([95, 96, 99].includes(code)) {
    Icon = CloudLightning;
  }

  return <Icon size={size} strokeWidth={1.7} />;
}

function formatDay(dateString, options) {
  return new Date(dateString + "T12:00:00").toLocaleDateString(
    "en-US",
    options
  );
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatSunTime(dateTimeString) {
  const timePart = dateTimeString.split("T")[1];
  const [hours, minutes] = timePart.split(":").map(Number);
  const localTime = new Date();
  localTime.setHours(hours, minutes, 0, 0);

  return localTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function getDaylightDuration(sunrise, sunset) {
  const toMinutes = (dateTimeString) => {
    const [hours, minutes] = dateTimeString.split("T")[1].split(":").map(Number);
    return hours * 60 + minutes;
  };

  const duration = toMinutes(sunset) - toMinutes(sunrise);
  return `${Math.floor(duration / 60)}h ${duration % 60}m`;
}

function getWindDirection(degrees) {
  const directions = [
    'N', 'NE', 'E', 'SE',
    'S', 'SW', 'W', 'NW'
  ];

  return directions[Math.round(degrees / 45) % 8];
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m"
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "weather_code",
      "is_day",
      "visibility",
      "uv_index"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "precipitation_probability_max"
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "7"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    throw new Error("Unable to retrieve weather information.");
  }

  return response.json();
}

async function searchCities(query) {
  const params = new URLSearchParams({
    name: query,
    count: "5",
    language: "en",
    format: "json"
  });

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);

  if (!response.ok) {
    throw new Error("Unable to fetch location information.");
  }

  const data = await response.json();

  return data.results || [];
}

function WeatherDetail({ icon: Icon, label, value, description }) {
  return (
    <div className="detail-card">
      <div className="detail-heading">
        <Icon size={18} />
        <span>{label}</span>
      </div>
      <h3>{value}</h3>
      <p>{description}</p>
    </div>
  );
}

function App() {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    loadWeather(DEFAULT_LOCATION);
  }, []);

  async function loadWeather(place) {
    setLoading(true);
    setError("");

    try {
      const data = await fetchWeather(
        place.latitude,
        place.longitude
      );

      setWeather(data);
      setLocation(place);
      setSearchResults([]);
      setSearchText("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    if (searchText.trim().length < 2) {
      setError("Enter at least two characters.");
      return;
    }

    setSearching(true);
    setError("");
    setSearchResults([]);

    try {
      const results = await searchCities(searchText.trim());

      if (results.length === 0) {
        setError("No matching locations found.");
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function selectLocation(place) {
    loadWeather(place);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const place = {
          name: "Your Location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        loadWeather(place);
      },
      () => {
        setLoading(false);
        setError(
          "Location permission denied or unavailable. Please allow location access."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  const current = weather?.current;
  const hourly = weather?.hourly;
  const daily = weather?.daily;

  const hourlyIndex = hourly
    ? Math.max(
      0,
      hourly.time.findIndex(
        (time) => time >= current.time
      )
    )
  : 0;

  const hourlyForecast = hourly
    ? hourly.time.slice(hourlyIndex, hourlyIndex + 6).map(
        (time, index) => ({
          time,
          temp: Math.round(
            hourly.temperature_2m[hourlyIndex + index]
          ),
          code: hourly.weather_code[hourlyIndex + index],
          isDay: hourly.is_day[hourlyIndex + index] === 1
        })
      )
    : [];

  const weeklyForecast = daily
    ? daily.time.map((date, index) => ({
        date,
        code: daily.weather_code[index],
        high: Math.round(daily.temperature_2m_max[index]),
        low: Math.round(daily.temperature_2m_min[index])
      }))
    : [];

  const expandedHourlyForecast = hourly && expandedDay
    ? hourly.time
        .map((time, index) => ({
          time,
          temp: Math.round(hourly.temperature_2m[index]),
          code: hourly.weather_code[index],
          isDay: hourly.is_day[index] === 1,
          precipitation: hourly.precipitation_probability[index],
          humidity: hourly.relative_humidity_2m[index]
        }))
        .filter((hour) =>
          hour.time.startsWith(expandedDay) &&
          (expandedDay !== daily.time[0] || hour.time >= current.time)
        )
    : [];

  const locationName = [
    location.name,
    location.admin1,
    location.country
  ].filter(Boolean).join(", ");

  const currentDate = current
    ? new Date(current.time).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
      })
    : "";

  const visibility = hourly
    ? hourly.visibility[hourlyIndex] / 1609.34
    : 0;

  const uvIndex = hourly
    ? hourly.uv_index[hourlyIndex]
    : 0;

  const precipitation = hourly
    ? hourly.precipitation_probability[hourlyIndex]
    : 0;

  const windDirection = current
    ? getWindDirection(current.wind_direction_10m)
    : "";

  if (loading && !weather) {
    return (
      <main className="app">
        <div className="loading-screen">
          <LoaderCircle className="loading-icon" size={38} />
          <h2>Loading Atmosphere...</h2>
          <p>Retrieving the latest weather information</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <Sun size={27} />
          <span>Atmosphere</span>
        </div>

        <form className="search-box" onSubmit={handleSearch}>
          <Search size={18} />

          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search for a city..."
          />

          <button type="submit" disabled={searching}>
            {searching ? (
              <LoaderCircle size={18} className="loading-icon" />
            ) : (
              "Go"
            )}
          </button>
        </form>

        <button
          className="location-button"
          onClick={useMyLocation}
        >
          <Navigation size={16} />
          My Location
        </button>
      </header>

      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((place) => (
            <button
              key={place.id}
              onClick={() => selectLocation(place)}
            >
              <MapPin size={17} />
              <span>
                <strong>{place.name}</strong>
                <small>
                  {[place.admin1, place.country]
                    .filter(Boolean)
                    .join(", ")}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}

      {loading && weather && (
        <p className="updating-message">
          Updating weather...
        </p>
      )}

      {weather && (
        <>
          <section className="dashboard">
            <div className="current-weather">
              <div className="location">
                <MapPin size={17} />
                <span>{locationName}</span>
              </div>

              <p className="date">{currentDate}</p>

              <div className="temperature-area">
                <div>
                  <h1>{Math.round(current.temperature_2m)}&deg;</h1>

                  <p className="condition">
                    {getWeatherDescription(current.weather_code)}
                  </p>

                  <p className="feels-like">
                    Feels like {Math.round(current.apparent_temperature)}&deg;
                  </p>
                </div>

                <div className="main-weather-icon">
                  <WeatherIcon
                    code={current.weather_code}
                    isDay={current.is_day === 1}
                    size={120}
                  />
                </div>
              </div>

              <div className="high-low">
                <span>
                  <Sun size={17} />
                  High: {Math.round(daily.temperature_2m_max[0])}&deg;
                </span>

                <span>
                  <Moon size={17} />
                  Low: {Math.round(daily.temperature_2m_min[0])}&deg;
                </span>
              </div>
            </div>

            <aside className="sun-card">
              <div className="sun-card-heading">
                <span className="sun-card-kicker">THE DAY AHEAD</span>
                <h2>Sunrise &amp; Sunset</h2>
                <p>Make the most of the daylight</p>
              </div>

              <div className="sun-times">
                <div className="sun-item">
                  <div className="sun-icon sunrise-icon">
                    <Sunrise size={27} strokeWidth={1.7} />
                  </div>
                  <div className="sun-time-copy">
                    <span>Sunrise</span>
                    <strong>{formatSunTime(daily.sunrise[0])}</strong>
                  </div>
                </div>

                <div className="sun-divider" />

                <div className="sun-item">
                  <div className="sun-icon sunset-icon">
                    <Sunset size={27} strokeWidth={1.7} />
                  </div>
                  <div className="sun-time-copy">
                    <span>Sunset</span>
                    <strong>{formatSunTime(daily.sunset[0])}</strong>
                  </div>
                </div>
              </div>

              <div className="daylight-note">
                <span>DAYLIGHT TODAY</span>
                <strong>{getDaylightDuration(daily.sunrise[0], daily.sunset[0])}</strong>
              </div>
            </aside>
          </section>

          <section className="section">
            <div className="section-heading">
              <h2>Today's Highlights</h2>
              <span>Current Conditions</span>
            </div>

            <div className="details-grid">
              <WeatherDetail
                icon={Wind}
                label="Wind"
                value={`${Math.round(current.wind_speed_10m)} mph`}
                description={`Direction: ${windDirection}`}
              />

              <WeatherDetail
                icon={Droplets}
                label="Humidity"
                value={`${Math.round(current.relative_humidity_2m)}%`}
                description="Relative humidity"
              />

              <WeatherDetail
                icon={Gauge}
                label="Pressure"
                value={`${(current.pressure_msl / 33.864).toFixed(2)} inHg`}
                description="Sea-level pressure"
              />

              <WeatherDetail
                icon={Eye}
                label="Visibility"
                value={`${visibility.toFixed(1)} mi`}
                description="Current visibility"
              />

              <WeatherDetail
                icon={Sun}
                label="UV Index"
                value={uvIndex.toFixed(1)}
                description="Current UV level"
              />

              <WeatherDetail
                icon={Umbrella}
                label="Precipitation"
                value={`${precipitation}%`}
                description="Chance of precipitation"
              />
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <h2>Hourly Forecast</h2>
              <span>Upcoming hours</span>
            </div>

            <div className="hourly-grid">
              {hourlyForecast.map((hour,index) => (
                <div
                  className={`hour-card ${index === 0 ? "active" : ""}`}
                  key={hour.time}
                >
                  <span>
                    {index === 0 ? "Now" : formatTime(hour.time)}
                  </span>

                  <WeatherIcon code={hour.code} isDay={hour.isDay} size={29} />
                  <strong>{hour.temp}&deg;</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <h2>7-Day Forecast</h2>
              <span>Upcoming weather</span>
            </div>

            <div className="weekly-card">
              {weeklyForecast.map((day, index) => {
                const isExpanded = expandedDay === day.date;
                const panelId = `hourly-${day.date}`;

                return (
                  <div className="forecast-day-group" key={day.date}>
                    <button
                      type="button"
                      className={`forecast-row forecast-row-toggle ${isExpanded ? "expanded" : ""}`}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                    >
                      <strong className="forecast-day">
                        {index === 0 ? "Today" : formatDay(day.date, { weekday: "long" })}
                      </strong>

                      <div className="forecast-condition">
                        <WeatherIcon code={day.code} size={23} />
                        <span>{getWeatherDescription(day.code)}</span>
                      </div>

                      <div className="forecast-temperatures">
                        <strong>{day.high}&deg;</strong>
                        <span>{day.low}&deg;</span>
                      </div>

                      <ChevronDown className="forecast-chevron" size={18} aria-hidden="true" />
                    </button>

                    {isExpanded && (
                      <div className="day-hourly-panel" id={panelId}>
                        <div className="day-hourly-heading">
                          <span>HOURLY FORECAST</span>
                          <span>{expandedHourlyForecast.length} hours</span>
                        </div>

                        {expandedHourlyForecast.length > 0 ? (
                          <div className="day-hourly-scroll">
                            {expandedHourlyForecast.map((hour) => (
                              <div className="day-hour-card" key={hour.time}>
                                <span className="day-hour-time">{formatTime(hour.time)}</span>
                                <WeatherIcon code={hour.code} isDay={hour.isDay} size={25} />
                                <strong className="day-hour-temp">{hour.temp}&deg;</strong>
                                <span className="day-hour-rain">
                                  <Umbrella size={12} /> {hour.precipitation ?? 0}%
                                </span>
                                <span className="day-hour-humidity">
                                  <Droplets size={12} /> {hour.humidity}%
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="day-hourly-empty">Hourly details are not available for this day.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <footer>
            <Thermometer size={15} />
            <span>
              Atmosphere Weather &bull; Weather data provided by Open-Meteo
            </span>
          </footer>
        </>
      )}

    </main>
  );
}

export default App;