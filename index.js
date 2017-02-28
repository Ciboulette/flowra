'use strict';
var util = require('util');
var async = require('async');
var requiredOptions = ['clientName', 'handleAction'];
var amqp = require('amqplib');

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
    this.clientName = options.clientName;
    this.handleAction = options.handleAction;
    this.user = options.user;
    this.password = options.password;
    this.url = "amqp://" + this.user + ":" + this.password + "@95.85.11.126:5672";
    this._connect();
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
            var ok = channel.assertQueue(that.clientName, {durable: true});
            ok.then(function() {
                channel.prefetch(1);
                return channel.consume(that.clientName, function(msg) {
                    var data = JSON.parse(msg.content.toString());
                    if (that.clientName == data.client) {
                        that.channel = channel;
                        that.msg = msg;
                        that._processMessage(data, that.handleAction);
                    }
                });
            });
            return ok.then(function() {
                console.log(' [x] Awaiting for Flow Server');
            });
        })
    }).catch(console.warn);
};

Flowra.prototype._processMessage = function(data, action, cb) {
    action(data);
};

module.exports = Flowra;
