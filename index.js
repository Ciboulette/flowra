'use strict';

require('dotenv').config()

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var requiredOptions = ['clientName'];
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
 * @param {function} options.handleAction
 */

function Flowra(options) {
    validate(options);

    this.clientName = options.clientName;
    this.handleAction = options.handleAction;
    this.stopped = true;
    this.url = process.env.ELIXIR_SERVER;
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

    var clientName = this.clientName;
    var handle = this.handle;
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
                      handle(msg, ch);
                    });
                });
                return ok.then(function() {
                    console.log(' [x] Awaiting for Flow Elixir Server');
                });
            })
        }).catch(console.warn);
    }
};

Flowra.prototype.handle = function(msg, ch) {

    console.log(msg.content.toString());
    ch.sendToQueue(msg.properties.replyTo, new Buffer("ok"), {correlationId: msg.properties.correlationId});
    ch.ack(msg);

}

/**
 * TEST PART
 */
const test = Flowra.create({clientName: 'lion'});

// test.handle("welcome", function(response) {
//   // console.log(response);
// })

test.start();
