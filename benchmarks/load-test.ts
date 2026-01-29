import autocannon from 'autocannon';

const url = process.env.TARGET_URL || `http://localhost:${process.env.PORT}`;

const instance = autocannon({
  url: url,
  connections: 10,              // Concurrent users
  duration: 10,                 // Test duration in seconds
  pipelining: 1,                // HTTP pipelining
  requests: [
      {
          method: 'GET',
          path: '/health'       // The specific endpoint to test
      }
  ]
}, (err, result) => {
    if (err) {
        console.error('Error running benchmark:', err);
        return;
    }

    console.log('\n--- Benchmarking Result ---');
    console.log(`URL:            ${result.url}`);
    console.log(`Requests/Sec:   ${result.throughput.average}`);
    console.log(`Latency (Avg):  ${result.latency.average} ms`);
    console.log(`Latency (P99):  ${result.latency.p99} ms`);
    console.log(`Total Requests: ${result.requests.total}`);
    console.log(`Total Errors:   ${result.errors + result.timeouts}`);
});

// Visualization
autocannon.track(instance, { renderProgressBar: true });
