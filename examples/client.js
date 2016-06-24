const p1 = require('../index')({
  host: 'amqp://admin:admin@192.168.1.105:5672'
}).producer;

var arr = [];
for (let j = 0; j < 1000000; j++) {
  arr.push(j);
}

function call (i, cb) {
  p1.rpc('q-test:plus', {time: Date.now()}, {
    expiration: 1000,
    timestamp: Date.now()
  })
  .then(function callRes (res) {
    console.log('q-test:plus', res);
    return 0;
  })
  .catch(function callErr (err) {
    console.error('q-test:plus err', err);
    return err;
  })
  .then(() => {
    // console.log('q-test:plus then', arguments);
    cb();
  });
}

function call2 (i, cb) {
  p1.send('q-test:product', {time: Date.now()})
  .then(function callRes (res) {
    console.log('q-test:product', res);
    return 0;
  })
  .catch(function callErr (err) {
    console.error('q-test:product err', err);
    return err;
  })
  .then(() => cb());
}

// const async = require('async');
// async.eachSeries(arr, call, () => console.log('finished'));
setInterval(call, 100);
setInterval(call2, 200);

// var heapdump = require('heapdump');
// setInterval(() => {
//   console.log('Current memory usage:\t%j', process.memoryUsage());
//   global.gc();
//   heapdump.writeSnapshot('./heap_' + Date.now() + '.heapsnapshot');
//   console.log('memory usage After GC:\t%j', process.memoryUsage());
// }, 30 * 1000);

// setInterval(() => {
//   let s = p1._rpcWaitings.size;
//   console.log('rpc size', s);
// }, 1000);