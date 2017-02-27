'use strict';
var EventEmitter = require('events').EventEmitter;
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
    this.password = options.password
    this.stopped = true;
    this.url =  "amqp://" + this.user + ":" + this.password + "@95.85.11.126:5672"
}

util.inherits(Flowra, EventEmitter);

/**
 * Construct a new Flowra Consumer
 */
Flowra.create = function(options) {
    return new Flowra(options)
};

/**
 * Start polling for actions.
 */
Flowra.prototype.start = function() {
    if (this.stopped) {
        console.log('Starting flowra consumer');
        this.stopped = false;
        this._connect();
    }
};

/**
 * Stop polling for actions.
 */
Flowra.prototype.stop = function() {
    console.log('Stoping flowra consumer');
    this.stopped = true;
};

Flowra.prototype._connect = function() {
    var handleAction = this.handleAction;
    var clientName = this.clientName;
    var _processMessage = this._processMessage;
    var url = this.url;
    if (!this.stopped) {
        return amqp.connect(url).then(function(conn) {
            process.once('SIGINT', function() {
                conn.close();
            });
            return conn.createChannel().then(function(ch) {
                var ok = ch.assertQueue(clientName, {durable: true});
                var ok = ok.then(function() {
                    ch.prefetch(1);
                    return ch.consume(clientName, function(msg) {
                      var data = JSON.parse(msg.content.toString());
                      if(clientName == data.client) {
                        _processMessage(data, handleAction, function() {
                          ch.sendToQueue(msg.properties.replyTo, new Buffer("ok"), {correlationId: msg.properties.correlationId});
                          ch.ack(msg);
                        });
                      }
                    });
                });
                return ok.then(function() {
                    console.log(' [x] Awaiting for Flow Server');
                });
            })
        }).catch(console.warn);
    }
};

Flowra.prototype._processMessage = function(data, action, cb) {
  async.series([
    function handle(done) {
      action(data);
      done();
    }
  ], function(err) {
    if(err) {

    } else {

    }
    cb();
  });
};


module.exports = Flowra;
