// const BaseRepository = require("../core/BaseRepository/BaseRepository");
const mysql = require('mysql2');
const dotenv = require("dotenv");
const { reject } = require('bcrypt/promises');
const { query } = require('express');
const OrderEntity = require('../entity/OrderEntity');

dotenv.config({
  path: "./.env",
});

class FulFillmentRepository {

  constructor() {

    const dbHost = process.env.DB_HOST;
    const dbUser = process.env.DB_USERNAME;
    const dbPass = process.env.DB_PASSWORD;
    const dbName = process.env.DB_DATABASE;


    const connection = mysql.createConnection({
      host: dbHost,  // or your database host
      user: dbUser,  // MySQL username
      password: dbPass,  // MySQL password
      database: dbName  // Database name
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

  async getLineitems(ids) {
    const placeholders = ids.map(() => '?').join(',');
    const query = `SELECT line_item_code FROM line_items WHERE line_item_code IN (${placeholders})`;

    return new Promise((resolve, reject) => {
      this.connect.query(query, ids, (err, results) => {
        if (err) {
          return reject(err); // Reject the promise on error
        }
        resolve(results); // Resolve the promise with results
      });
    });
  }

  async getCompanyPersonalizedMessages(companyCode, receiverCountryCode) {
    const query = `
    SELECT 
    companies.*, 
    COUNT(personalized_messages.id) AS personalizedMessageCount,
    personalized_messages.*, 
    integrations.name AS integration_name
FROM 
    companies
JOIN 
    personalized_messages 
    ON personalized_messages.company_code = companies.company_code
JOIN 
    integrations 
    ON personalized_messages.integration_code = integrations.integration_code
JOIN 
    message_hooks 
    ON message_hooks.message_hook_code = personalized_messages.message_hook_code
WHERE 
    companies.company_code = ?
    AND message_hooks.content = 'Integration Based: Fulfillment Created'
    AND (
        (personalized_messages.receiver_country_code = ? 
        AND personalized_messages.is_integration_specific = 1)
        OR 
        (personalized_messages.is_receiver_country_specific = 0 
        AND personalized_messages.is_integration_specific = 1)
    )
    -- Add conditions to check that deleted_at is NULL (soft delete) in relevant tables
    AND companies.deleted_at IS NULL
    AND personalized_messages.deleted_at IS NULL
    AND integrations.deleted_at IS NULL
GROUP BY 
    companies.id, 
    personalized_messages.id, 
    message_hooks.id
LIMIT 1;

    `;

    return new Promise((resolve, reject) => {
      this.connect.query(query, [companyCode, receiverCountryCode], (err, results) => {
        if (err) {
          return reject(err); // Reject the promise on error
        }
        resolve(results.length > 0 ? results[0] : []); // Resolve the promise with results
      });
    });
  }

  async getPersnoalizeEmailAsCharges(asChargeCode) {

    const query = ` SELECT * FROM as_charges WHERE as_charge_code = ${asChargeCode}`;

    return new Promise((resolve, reject) => {
      this.connect.query(query, asChargeCode, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results.length > 0 ? results[0] : []);
      })
    })
  }

  //getting orders fulfillments count
  async getOrderFulfillmentsCount(orderCode) {
    const query = `
    SELECT 
    o.order_code,
        COUNT(*) AS fulfillment_count
    FROM 
        orders o
    JOIN 
        fulfillments f ON o.order_code = f.order_code
    WHERE 
        o.order_code = ${orderCode}
        AND f.is_cancelled = 0 
        AND f.fulfillment_type = 'DEFAULT'
    GROUP BY 
    o.order_code;
    `;

    return new Promise((resolve, reject) => {
      this.connect.query(query, orderCode, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results[0]);
      })
    })
  }
  
  //getting orders fulfillments
  async getOrderFulfillments(orderCode) {
    const query = `
    SELECT 
      *
    FROM
      fulfillments
    WHERE
      order_code = ${orderCode}
    AND
      is_cancelled = 0
    AND
      fulfillment_type = "DEFAULT"
    AND
      deleted_at IS NULL
    `;

    return new Promise((resolve, reject) => {
      this.connect.query(query, orderCode, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      })
    })
  }

  //getting cancelled fulfillments
  async getOrderCancelledFulfillmentsCount(orderCode) {
    const query = `
    SELECT 
    o.order_code,
        COUNT(*) AS fulfillment_count
    FROM 
        orders o
    JOIN 
        fulfillments f ON o.order_code = f.order_code
    WHERE 
        o.order_code = ${orderCode}
        AND f.is_cancelled = 1 
    GROUP BY 
    o.order_code;
    `;

    return new Promise((resolve, reject) => {
      this.connect.query(query, orderCode, (err, results) => {
        if (err) {
          return reject(err);
        }
        if (results.length > 0) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      })
    })
  }

  //inserting fulfillment into dabatase
  async createFulfillment(fulfillmentPayload) {
    const query = `
      INSERT INTO fulfillments (
        line_item_code,
        quantity,
        order_code, 
        order_id, 
        integration_code, 
        refund_id, 
        name,
        fulfillment_code, 
        packaging_code, 
        reason, 
        comment,
        fulfillment_type, 
        reference,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      fulfillmentPayload.line_item_code,
      fulfillmentPayload.quantity,
      fulfillmentPayload.order_code,
      fulfillmentPayload.order_id,
      fulfillmentPayload.integration_code,
      fulfillmentPayload.refund_id || null,
      fulfillmentPayload.name,
      fulfillmentPayload.fulfillment_code,
      fulfillmentPayload.packaging_code || null,
      fulfillmentPayload.reason || null,
      fulfillmentPayload.comment || null,
      fulfillmentPayload.fulfillment_type || 'DEFAULT', // Default value
      fulfillmentPayload.reference || null
    ];

    return new Promise((resolve, reject) => {
      this.connect.query(query, values, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }

  //marking order as fulfilled either partially or fully
  async markOrderAsFulfilled(orderCode) {
    //getting line items of order
    const lineItems = await this.getOrderLineitems(orderCode);

    let isOrderFulfilled = true;
    //iterating over line item to check whether order is fulfilled partially or fully
    for (const lineItem of lineItems) {
      if (lineItem.fulfillable_quantity != 0) {
        isOrderFulfilled = false;
        break;
      }
    }

    await this.updateOrderFulfillmentStatus(orderCode, isOrderFulfilled);

  }

  //updating order_status (packed, fulfilled, delivered etc)
  async updateOrderFulfillmentStatus(orderCode, isOrderFulfilled) {
    let orderStatus, fulfillmentStatus;

    // Set order and fulfillment status based on whether the order is fulfilled
    if (isOrderFulfilled) {
      orderStatus = OrderEntity.ORDER_STATUS.PACKED;
      fulfillmentStatus = "Fulfilled";
    } else {
      orderStatus = OrderEntity.ORDER_STATUS.PARTIAL_FULFILLMENT;
      fulfillmentStatus = "Partially Fulfilled";
    }

    const query = `UPDATE orders SET order_status = ?, fulfillment_status = ?, is_touched = 1 WHERE order_code = ?`;
    return new Promise((resolve, reject) => {
      // Execute the query with the values for the placeholders
      this.connect.query(query, [orderStatus, fulfillmentStatus, orderCode], (err, result) => {
        if (err) {
          return reject(err); // Handle error case
        }
        resolve(result); // Return the result on success
      });
    });
  }

  //getting line items of an order
  async getOrderLineitems(orderCode) {
    const query = `SELECT * FROM line_items WHERE order_code = ${orderCode} `;
    return new Promise((resolve, reject) => {
      this.connect.query(query, orderCode, (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      })
    });
  }

  //end of class
}
module.exports = FulFillmentRepository;
