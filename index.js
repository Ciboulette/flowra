'use strict';
var util = require('util');
var requiredOptions = ['application_id', 'handleAction', 'api_key'];
var amqp = require('amqplib');
var request = require('request');
/**
 * Construct a new FlowError
 */
function FlowError(message) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = (message || '');
}
util.inherits(FlowError, Error);

function validate(options) {
    requiredOptions.forEach(function(option) {
        if (!options[option]) {
            throw new Error('Missing Flow consumer option [' + option + '].');
        }
    });
}

/**
 * A Flow consumer.
 * @param {object} options
 * @param {string} options.clientName
 */

function Flowra(options) {
    validate(options);
    this.application_id = options.application_id;
    this.api_key = options.api_key;
    this.handleAction = options.handleAction;
    var that = this;

    var options = {
        url: 'http://flow.dev/api/rabbitmq/' + this.application_id + '?api_token=' + this.api_key,
        headers: {
            'Accept': 'application/json'
        }
    };

    request(options, function(error, response, body) {
        const data = JSON.parse(body);
        if (data.user && data.password) {
            that.url = "amqp://" + data.user + ":" + data.password + "@localhost:5672/";
            that._connect();
        } else {
            console.log("bad identifiants:" + data.error);
        }
    });
}

/**
 * Construct a new Flowra Consumer
 */
Flowra.start = function(options) {

    return new Flowra(options)
};

Flowra.prototype.success = function(message) {
    var that = this;
    var response = {
        data: message
    }
    that.channel.sendToQueue(that.msg.properties.replyTo, Buffer(JSON.stringify(response)), {correlationId: that.msg.properties.correlationId});
    that.channel.ack(that.msg);
}

Flowra.prototype.failure = function(message) {
    var that = this;
    var response = {
        error: {
            detail: message
        }
    }
    that.channel.sendToQueue(that.msg.properties.replyTo, Buffer(JSON.stringify(response)), {correlationId: that.msg.properties.correlationId});
    that.channel.ack(that.msg);
}

Flowra.prototype._connect = function() {
    var that = this;
    return amqp.connect(that.url).then(function(connection) {
        process.once('SIGINT', function() {
            connection.close();
        });
        return connection.createChannel().then(function(channel) {
            var ok = channel.assertQueue(that.application_id, {durable: true});
            ok.then(function() {
                channel.prefetch(1);
                console.log(' [x] Awaiting for Flow Server');
                return channel.consume(that.application_id, function(msg) {
                    var data = JSON.parse(msg.content.toString());
                    that.channel = channel;
                    that.msg = msg;
                    that._processMessage(data, that.handleAction);
                });
            });
            return ok.then(function() {});
        })
    }).catch(console.warn);
};

Flowra.prototype._processMessage = function(data, action, cb) {
    action(data);
};

module.exports = Flowra;
