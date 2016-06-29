const c1 = require('../index')({
  host: 'amqp://admin:admin@192.168.1.105:5672'
}).consumer;

c1.consume('q-test:plus', msg => {
  // console.log('q-test:plus receive', (Date.now() - msg.time));
  return new Promise((resolve) => {
    throw new Error('server error 555');
  });
});


c1.consume('q-test:product', msg => {
  // console.log('q-test:product receive', (Date.now() - msg.time));
  return new Promise((resolve) => {
    resolve('Hello, World! plus');
  });
});