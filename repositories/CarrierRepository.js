// const BaseRepository = require("../core/BaseRepository/BaseRepository");
const mysql = require('mysql2');
const dotenv = require("dotenv");
const { reject } = require('bcrypt/promises');
const { query } = require('express');

dotenv.config({
  path: "./.env",
});

class CarrierRepository {

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

  //getting carrier
  async getCarrier(orderCode){
    const query = `
      SELECT 
        c.name AS carrier_name
      FROM 
          orders o
      JOIN 
          templates t ON o.delivery_template_code = t.template_code
      JOIN 
          carrier_products cp ON t.carrier_product_code = cp.carrier_product_code
      JOIN 
          carriers c ON cp.carrier_code = c.carrier_code
      WHERE
      o.order_code = ${orderCode};  
    `    
    return new Promise((resolve, reject) => {
      this.connect.query(query, orderCode, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.length > 0 ? result[0] : []);
      });
    });
  }
 

}

module.exports = CarrierRepository;
