require('dotenv').config(); // .env-Datei laden

const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// InfluxDB-Konfiguration (aus .env-Datei)
const INFLUXDB_URL = process.env.INFLUXDB_URL;
const INFLUXDB_TOKEN = process.env.INFLUXDB_TOKEN;
const INFLUXDB_ORG = process.env.INFLUXDB_ORG;
const INFLUXDB_BUCKET = process.env.INFLUXDB_BUCKET;

// Netatmo-API-Konfiguration (aus .env-Datei)
const NETATMO_API_URL = 'https://api.netatmo.com/api/getstationsdata';
const NETATMO_ACCESS_TOKEN = process.env.NETATMO_ACCESS_TOKEN;

// InfluxDB-Client vorbereiten
const influxdb = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN });
const writeApi = influxdb.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET, 'ns');

// Funktion zur Netatmo-Abfrage
async function getNetatmoData() {
  const response = await fetch(`${NETATMO_API_URL}?access_token=${NETATMO_ACCESS_TOKEN}`);
  const data = await response.json();
  return data;
}

// Funktion zum Schreiben der Daten in InfluxDB
async function writeDataToInfluxDB() {
  try {
    const netatmoData = await getNetatmoData();

    const dashboard = netatmoData.body.devices[0].dashboard_data;
    const temperature = dashboard.Temperature;
    const humidity = dashboard.Humidity;
    const co2 = dashboard.CO2 || null;
    const pressure = dashboard.Pressure || null;

    const point = new Point('netatmo_data')
      .tag('location', 'Wohnzimmer')
      .floatField('temperature', temperature)
      .floatField('humidity', humidity);

    if (co2 !== null) point.floatField('co2', co2);
    if (pressure !== null) point.floatField('pressure', pressure);

    writeApi.writePoint(point);
    await writeApi.flush();

    console.log('✅ Daten erfolgreich an InfluxDB gesendet!');
  } catch (error) {
    console.error('❌ Fehler beim Schreiben der Daten:', error);
  }
}

// Ausführung starten
writeDataToInfluxDB();