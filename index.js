'use strict';
var util = require('util');
var amqp = require('amqplib');
var request = require('request');
var config = require('./config');
var requiredConfigOptions = ['app_id', 'user_token'];
var requiredWorkflowOptions = ['type', 'data'];

function configValidation(options) {
  requiredConfigOptions.forEach(function(option) {
      if (!options[option]) {
          throw new Error('Missing Flow worker option [' + option + '].');
      }
  });
}

function workflowValidation(options) {
  requiredWorkflowOptions.forEach(function(option) {
      if (!options[option]) {
          throw new Error('Missing Flow worker option [' + option + '].');
      }
  });
}

/**
 * A Flowra instance.
 * @param {object} options
 * @param {string} options.app_id
 * @param {string} options.app_env
 * @param {string} options.user_token
 */
function Flowra(options) {
  this.app_id = options.app_id;
  this.user_token = options.user_token;
  this.app_env = options.app_env ? options.app_env : 'prod';

  // Functions
  this._getRabbitMQCredentials = this._getRabbitMQCredentials.bind(this);
  this.worker.start = this.worker.start.bind(this);
  this._success = this._success.bind(this);
  this._failure = this._failure.bind(this);
  this.workflow.start = this.workflow.start.bind(this);

}

/**
 * Construct a new Flowra Instance
 */
Flowra.config = function(options) {
  configValidation(options);
  return new Flowra(options);
};

Flowra.prototype._getRabbitMQCredentials = function() {
  var that = this;
  return new Promise(function(resolve, reject) {
    var headers = {
        url: 'http://flow.dev/api/rabbitmq/?app_env=' + that.app_env + '&app_id=' + that.app_id + '&api_token=' + that.user_token,
        headers: {
            'Accept': 'application/json'
        }
    };
    request(headers, function(error, response, body) {
        var data = JSON.parse(body);
        if (!(data.rabbitMQ_user && data.rabbitMQ_password)) {
            console.log("bad identifiants:" + data.error);
            reject(data.error);
        }
        var url = "amqp://" + data.rabbitMQ_user + ":" + data.rabbitMQ_password + "@95.85.11.126:5672";
        var queue = data.rabbitMQ_queue;
        resolve({url: url, queue: queue });
    });

  });
}

/**
 * Connect function
 * private
 */
Flowra.prototype._connect = function(callback) {
    var that = this;
    return amqp.connect(that.url).then(function(connection) {
        process.once('SIGINT', function() {
            connection.close();
        });
        return connection.createChannel().then(function(channel) {
            channel.prefetch(1);
            console.log(' [x] Awaiting for Flow Server');
            return channel.consume(that.queue, function(msg) {
                var data = JSON.parse(msg.content.toString());
                that.channel = channel;
                that.msg = msg;
                callback("task", data, that._success, that._failure);
            });
        })
    }).catch(console.warn);
}

Flowra.prototype.worker = {};
Flowra.prototype.worker.start = function(callback) {
  var that = this;
  this._getRabbitMQCredentials()
    .then(function(data) {
      that.queue = data.queue;
      that.url = data.url;
      that._connect(callback);
    })
    .catch(function(error) {
      console.log(error);
    });
}


/**
 * Success function when the worker is done and can respond to the server
 * used by the worker
 */
Flowra.prototype._success = function(message) {
    var that = this;

    var response = {
        data: message
    }
    that.channel.sendToQueue(that.msg.properties.replyTo, Buffer(JSON.stringify(response)), {correlationId: that.msg.properties.correlationId});
    that.channel.ack(that.msg);
}

/**
 * Failure function when the worker is sending error
 * used by the worker
 */
Flowra.prototype._failure = function(message) {
    var that = this;
    var response = {
        error: {
            detail: message
        }
    }
    that.channel.sendToQueue(that.msg.properties.replyTo, Buffer(JSON.stringify(response)), {correlationId: that.msg.properties.correlationId});
    that.channel.ack(that.msg);
}


Flowra.prototype.workflow = {};
Flowra.prototype.workflow.start = function(options) {
  workflowValidation(options);

  this.type = options.type;
  this.data = options.data;
  var that = this;
  return new Promise(function(resolve, reject) {
    var headers = {
        url: 'http://flow.dev/api/workflows/?app_env=' + that.app_env + '&app_id=' + that.app_id + '&api_token=' + that.user_token,
        headers: {
            'Accept': 'application/json'
        },
        form: {
          type: that.type,
          payload: {
            data: that.data,
          }
        }
    };
    request.post(headers, function(error, response, body) {
      if(error) {
        reject(error);
      }
      resolve(body);
    });
  });
}


module.exports = Flowra;
