const mysql = require('mysql2');
const dotenv = require("dotenv");
const { reject } = require('bcrypt/promises');

dotenv.config({
  path: "./.env",
});

class CountryRepository {

  constructor() {
    const dbHost = process.env.DB_HOST;
    const dbUser = process.env.DB_USERNAME;
    const dbPass = process.env.DB_PASSWORD;
    const dbName = process.env.DB_DATABASE;

    // Set up MySQL connection
    const connection = mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPass,
      database: dbName
    });

    this.connect = connection;

    // Connect to the database
    connection.connect((err) => {
      if (err) {
        console.error('Error connecting to MySQL:', err.stack);
        return;
      }
      console.log('Connected to MySQL as id ' + connection.threadId);
    });
  }

  //getting country
  async getCountryByCountryCode(countryCode){
    const query = `
      SELECT default_name FROM countries WHERE country_code = ${countryCode};
    `    
    return new Promise((resolve, reject) => {
      this.connect.query(query, countryCode, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result[0]);
      });
    });
  }
 

}

module.exports = CountryRepository;
