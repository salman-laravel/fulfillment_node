const mysql = require('mysql2');
const dotenv = require("dotenv");

dotenv.config({
  path: "./.env",
});

class CustomerRepository {

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
  async findCustomer(customerCode) {
    const query = `
      SELECT * FROM customers WHERE customer_code = ${customerCode};
    `
    return new Promise((resolve, reject) => {
      this.connect.query(query, customerCode, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.length > 0 ? result[0] : []);
      });
    });
  }

  //create customer
  async createCustomer(data) {
    const query = `
      INSERT INTO customers (
        customer_code,
        first_name,
        last_name,
        email,
        phone,
        company_code,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW());
    `;

    const selectQuery = `
      SELECT * FROM customers WHERE id = ?;
    `;

    const values = [
      data.customer_code,
      data.first_name,
      data.last_name,
      data.email,
      data.phone,
      data.company_code
    ];

    return new Promise((resolve, reject) => {
      this.connect.query(query, values, (err, result) => {
        if (err) {
          return reject(err);
        }
        const insertId = result.insertId;

        this.connect.query(selectQuery, [insertId], (err, customerResult) => {
          if (err) {
            return reject(err);
          }
          resolve(customerResult.length > 0 ? customerResult[0] : null);
        });
      });
    });
  }

}

module.exports = CustomerRepository;
