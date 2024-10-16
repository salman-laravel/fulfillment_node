const dotenv = require("dotenv");

dotenv.config({
  path: "./.env",
});


const port = process.env.PORT;
const app = require("./app");

// Start the server

const server = app.listen(port,() => {
  console.log(`server is running on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  
    console.log("UNHANDLED REJECTION!!!  shutting down ...");
    console.log(err.name, err.message);
    // server.close(() => {
    //   process.exit(1);
    // });
  });


