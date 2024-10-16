const mysql = require('mysql2');
const dotenv = require("dotenv");

dotenv.config({
  path: "./.env",
});

class EventRepository {

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

  // Method to create an event
  async createEvent(eventPayload) {
    const event_code = generateHash(); 
    
    const query = `
      INSERT INTO events (
        event_code,
        order_code,
        subject_type, 
        verb, 
        author,
        message, 
        description, 
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      event_code,
      eventPayload.order_code,
      eventPayload.subject_type,
      eventPayload.verb,
      eventPayload.author,
      eventPayload.message,
      eventPayload.description,
    ];

    // Return a promise to handle async/await functionality
    return new Promise((resolve, reject) => {
      this.connect.query(query, values, (err, result) => {
        if (err) {
          return reject(err);  // Reject promise if an error occurs
        }
        resolve(result);  // Resolve with the result if successful
      });
    });
  }

}

module.exports = EventRepository;
