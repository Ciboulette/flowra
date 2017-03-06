require('dotenv').config();


module.exports = {
    url: process.env.URL_API || "http://www.barbouze.fr/api/",
    env: process.env.APP_ENV || "prod",
    rabbitMQ_ip: process.env.RABBITMQ_IP || "146.185.190.132",
    rabbitMQ_port: process.env.RABBITMQ_PORT || "5672"
};
