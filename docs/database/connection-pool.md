# Database Connection Pool Management

## Overview

The ChargerSIMService uses a sophisticated connection pool management system built on top of `pg-pool`. This document details the implementation, monitoring, and lifecycle management of database connections.

## Architecture

### Core Components

1. **ConnectionPoolManager**
   - Extends EventEmitter for async event handling
   - Manages a single PostgreSQL connection pool
   - Implements connection tracking and metrics
   - Handles graceful shutdown

2. **DatabaseService**
   - Manages pool initialization and shutdown
   - Integrates with the application lifecycle
   - Handles database setup and teardown

## Connection Lifecycle

### Initialization
```typescript
// In App.ts
await DatabaseService.initialize(container);
```

1. Pool creation with configured settings
2. Initial connection test
3. Table initialization if needed
4. Event handler setup

### Connection Acquisition
1. Client requests connection via `getConnection(options?)`
2. Connection tracking starts
3. Monkey-patched methods are applied
4. Transaction settings are configured if specified

### Connection Release
1. Automatic or manual release trigger
2. Cleanup of monkey-patched methods
3. Metric updates
4. Connection return to pool

### Shutdown
1. HTTP server stops accepting new requests
2. Active requests complete (max 10s wait)
3. Pool drains existing connections
4. Pool termination

## Monkey-Patching

The system implements runtime method patching for enhanced functionality:

### Query Method
```typescript
client.query = (...args) => {
    // Added functionality:
    // 1. Query timeout tracking
    // 2. pg_cancel_backend for hung queries
    // 3. Metric collection
    // 4. Error handling
}
```

### Release Method
```typescript
client.release = (errOrBool?) => {
    // Added functionality:
    // 1. Connection cleanup
    // 2. Metric updates
    // 3. Timer clearance
    // 4. Event emission
}
```

## Metrics Tracking

### Connection Metrics
- Total connections created
- Currently active connections
- Failed acquisitions
- Connection durations
- Max concurrent connections
- Pool utilization stats

### Historical Data
```typescript
connectionHistory: Array<{
    type: 'acquired' | 'released' | 'failed_acquire' | 'client_error_released';
    timestamp: Date;
    connectionId?: string;
    durationMs?: number;
    error?: string;
}>
```

### Pool Statistics
- Total pool size
- Idle connections
- Waiting requests
- Connection ages

## Configuration

### Pool Settings
```typescript
{
    max: 5,                           // Max pool size
    idleTimeoutMillis: 10000,        // 10s idle timeout
    connectionTimeoutMillis: 8000,    // 8s connection timeout
    ssl: getSSLConfig(nodeEnv)        // Environment-specific SSL
}
```

### Query Timeouts
- Default query timeout: 10 seconds
- Long-running connection warning: 30 minutes
- Connection acquisition timeout: 8 seconds

## Error Handling

### Types of Errors
1. Connection acquisition failures
2. Query timeouts
3. Client errors
4. Pool shutdown errors

### Error Recovery
- Automatic connection cleanup
- Query cancellation for timeouts
- Force disconnect for problematic clients
- Metric tracking of failures

## Best Practices

1. **Transaction Management**
   ```typescript
   let transactionSuccessfullyStarted = false;
   try {
       await transactionManager.beginTransaction();
       transactionSuccessfullyStarted = true;
       // ... transaction work ...
       await transactionManager.commit();
   } catch (error) {
       if (transactionSuccessfullyStarted) {
           await transactionManager.rollback();
       }
       throw error;
   }
   ```

2. **Connection Release**
   - Always use try-finally blocks
   - Check connection state before release
   - Handle errors during release

3. **Query Timeouts**
   - Set appropriate timeouts for operation type
   - Implement retry logic for timeouts
   - Log timeout occurrences

## Monitoring

### Metrics Logging
- Automatic logging every 60 seconds
- Connection pool statistics
- Long-running connection warnings
- Error rate monitoring

### Health Checks
- Pool connectivity verification
- Connection age monitoring
- Resource utilization tracking

## Troubleshooting

### Common Issues
1. Connection timeouts
   - Check max pool size
   - Verify connection release
   - Monitor transaction duration

2. Pool exhaustion
   - Review active connection count
   - Check for connection leaks
   - Monitor query performance

3. Shutdown hangs
   - Verify transaction completion
   - Check for unreleased connections
   - Review shutdown timeout settings

### Debug Tools
```typescript
// Get current pool metrics
const metrics = poolManager.getMetricsSummary();

// Check connection ages
const ages = poolManager.getConnectionAges();

// View active connections
console.log(poolManager.metrics.activeLeasedConnections);
```
