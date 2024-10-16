const mysql = require('mysql2');
const dotenv = require("dotenv");

dotenv.config({
  path: "./.env",
});

class OrderRepository {

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

  async getOrder(orderCode) {

    const query = `
      SELECT 
          o.*, 
          c.id AS customerId, 
          c.country_code AS customer_country_code, 
          c.country_code AS customerCountryCode,
          t.additional_services AS templateAdditionalServices 
      FROM 
          orders o
      JOIN 
          customers c ON o.customer_code = c.customer_code 
      JOIN 
          templates t ON o.delivery_template_code = t.template_code 
      WHERE 
          o.order_code = ? 
          AND o.deleted_at IS NULL 
          AND c.deleted_at IS NULL 
          AND t.deleted_at IS NULL
      LIMIT 1
      `;
  
  
    return new Promise((resolve, reject) => {
      this.connect.query(query, orderCode, (err, results) => {
        if (err) {
          return reject(err); // Reject the promise on error
        }
        resolve(results[0]); // Resolve the promise with results
      });
    });
  }
 
}

module.exports = OrderRepository;





