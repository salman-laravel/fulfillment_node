const mysql = require('mysql2');
const dotenv = require("dotenv");

dotenv.config({
  path: "./.env",
});

class UserRepository {

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

  async getUserByEmail(email) {
    const query = `
      SELECT * FROM users WHERE email = ?;
    `;
  
    return new Promise((resolve, reject) => {
      this.connect.query(query, [email], (err, results) => {
        if (err) {
          return reject(err); // Reject the promise on error
        }
        resolve(results); // Resolve the promise with results
      });
    });
  }
  

}

module.exports = UserRepository;





