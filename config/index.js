require('dotenv').config();


module.exports = {
    url: process.env.URL_API || "http://www.flowra.io/api",
    env: process.env.APP_ENV || "prod",
    rabbitMQ_ip: process.env.RABBITMQ_IP || "188.166.74.245",
    rabbitMQ_port: process.env.RABBITMQ_PORT || "5672"
};
