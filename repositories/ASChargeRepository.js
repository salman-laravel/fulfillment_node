const mysql = require('mysql2');
const dotenv = require("dotenv");
const { reject } = require('bcrypt/promises');

dotenv.config({
  path: "./.env",
});

class ASChargeRepository {

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

  //getting ascharge
  async asCharge(asChargeCode){
    const query = `
      SELECT 
        ac.*, 
        asrv.* 
      FROM 
          as_charges ac
      JOIN 
          additional_services asrv 
          ON ac.additional_service_code = asrv.additional_service_code
      WHERE 
          ac.as_charge_code = ${asChargeCode}
      LIMIT 1;
    `;    
    return new Promise((resolve, reject) => {
      this.connect.query(query, asChargeCode, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.length > 0 ? result[0] : []);
      });
    });
  }
 

}

module.exports = ASChargeRepository;
