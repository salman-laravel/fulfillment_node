const { createClient } = require('@redis/client');

const client = createClient(); // Create a new Redis client

client.on('error', (err) => {
    console.error('Error connecting to Redis:', err);
});

async function checkRedisStatus() {
    try {
        await client.connect(); // Connect to the Redis server
        const result = await client.ping(); // Send a ping command
        console.log('Redis is up and running. Ping result:', result);
    } catch (err) {
        console.error('Error during ping:', err);
    } finally {
        await client.quit(); // Close the connection
    }
}

checkRedisStatus();
