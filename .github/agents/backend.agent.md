---
name: backend-development
description: Comprehensive backend development skill for building secure, scalable, and maintainable server-side applications, APIs, databases, and microservices. Use this for all server-side logic, data management, authentication, and business logic implementation.
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'supabase/*', 'sequential-thinking/*', 'agent', 'ms-vscode.vscode-websearchforcopilot/websearch', 'todo']
---

# Backend Development Expert Skill

## Core Principles

### 1. Architecture & Design Patterns
- **Separation of Concerns** - Keep routing, business logic, data access, and presentation separate
- **Single Responsibility** - Each module/class/function does one thing well
- **Dependency Injection** - Pass dependencies rather than hard-coding them
- **Interface Segregation** - Clients shouldn't depend on interfaces they don't use
- **Open/Closed Principle** - Open for extension, closed for modification
- **Fail Fast** - Validate early, return errors immediately
- **Defense in Depth** - Multiple layers of security, never trust input

### 2. API Design Philosophy
- **RESTful when possible** - Standard HTTP methods, resource-based URLs
- **Versioning from day one** - `/api/v1/`, `/api/v2/`
- **Consistent response formats** - Same structure for success/error across all endpoints
- **Idempotency** - PUT, DELETE should be idempotent; POST may not be
- **Pagination by default** - Never return unbounded data sets
- **Rate limiting** - Protect against abuse
- **Documentation as code** - OpenAPI/Swagger specs

### 3. Database Strategy
- **Normalize first, denormalize strategically** - Start with proper normalization
- **Index intelligently** - Index foreign keys, frequently queried columns, but not everything
- **Use transactions** - ACID compliance for critical operations
- **Connection pooling** - Reuse connections, don't create per-request
- **Query optimization** - Use EXPLAIN, avoid N+1 queries
- **Backup automation** - Regular automated backups with tested restore procedures

## DO's ✅

### API Design
- ✅ Use plural nouns for resources: `/api/v1/users` not `/api/v1/user`
- ✅ Use HTTP status codes correctly
  ```
  200 OK - Success
  201 Created - Resource created
  204 No Content - Success, no body
  400 Bad Request - Client error
  401 Unauthorized - Not authenticated
  403 Forbidden - Authenticated but not authorized
  404 Not Found - Resource doesn't exist
  409 Conflict - Resource conflict (duplicate)
  422 Unprocessable Entity - Validation error
  429 Too Many Requests - Rate limited
  500 Internal Server Error - Server error
  503 Service Unavailable - Temporary unavailability
  ```
- ✅ Return consistent error format
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid email format",
      "details": [
        {
          "field": "email",
          "message": "Must be a valid email address"
        }
      ],
      "timestamp": "2025-01-15T10:30:00Z",
      "requestId": "abc-123-xyz"
    }
  }
  ```
- ✅ Use query parameters for filtering, sorting, pagination
  ```
  GET /api/v1/users?status=active&sort=created_at:desc&page=2&limit=20
  ```
- ✅ Support field selection (sparse fieldsets)
  ```
  GET /api/v1/users?fields=id,name,email
  ```
- ✅ Use proper HTTP methods
  ```
  GET    - Retrieve resource(s)
  POST   - Create resource
  PUT    - Full update/replace
  PATCH  - Partial update
  DELETE - Remove resource
  ```
- ✅ Include metadata in list responses
  ```json
  {
    "data": [...],
    "meta": {
      "page": 2,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
  ```

### Security
- ✅ **Validate ALL input** - Never trust client data
  ```typescript
  // RECOMMENDED: Use Zod for runtime validation + type inference
  import { z } from 'zod';
  
  const userSchema = z.object({
    email: z.string().email(),
    age: z.number().int().min(0).max(150).optional(),
    role: z.enum(['user', 'admin']),
  });
  
  type UserInput = z.infer<typeof userSchema>;
  
  // Parse throws on invalid data
  const validData = userSchema.parse(req.body);
  
  // Or use safeParse for manual error handling
  const result = userSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ error: result.error.flatten() });
  }
  ```
- ✅ **Hash passwords** - Use bcrypt, argon2, or scrypt
  ```javascript
  const bcrypt = require('bcrypt');
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  ```
- ✅ **Use environment variables** for secrets
  ```javascript
  require('dotenv').config();
  const apiKey = process.env.API_KEY; // Never hardcode
  ```
- ✅ **Implement rate limiting**
  ```javascript
  const rateLimit = require('express-rate-limit');
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests'
  });
  
  app.use('/api/', limiter);
  ```
- ✅ **Use JWT properly**
  ```javascript
  // Short expiration for access tokens
  const accessToken = jwt.sign(payload, SECRET, { expiresIn: '15m' });
  
  // Longer expiration for refresh tokens
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
  ```
- ✅ **Sanitize output** - Prevent XSS
  ```javascript
  const sanitize = require('mongo-sanitize');
  const clean = sanitize(req.body); // Prevent NoSQL injection
  ```
- ✅ **Use HTTPS only** in production
- ✅ **Implement CORS properly**
  ```javascript
  const cors = require('cors');
  
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  ```
- ✅ **Set security headers**
  ```javascript
  const helmet = require('helmet');
  app.use(helmet()); // Sets X-Frame-Options, X-Content-Type-Options, etc.
  ```
- ✅ **Log security events** - Failed logins, authorization failures
- ✅ **Implement CSRF protection** for state-changing operations
- ✅ **Use parameterized queries** - Prevent SQL injection
  ```javascript
  // Bad - SQL injection vulnerable
  db.query(`SELECT * FROM users WHERE id = ${userId}`);
  
  // Good - parameterized
  db.query('SELECT * FROM users WHERE id = ?', [userId]);
  ```

### Database Operations
- ✅ **Use transactions** for multi-step operations
  ```javascript
  const transaction = await sequelize.transaction();
  
  try {
    await User.create(userData, { transaction });
    await Profile.create(profileData, { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  ```
- ✅ **Create indexes** for frequently queried fields
  ```sql
  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_orders_user_id ON orders(user_id);
  CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
  ```
- ✅ **Use connection pooling**
  ```javascript
  const pool = new Pool({
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  ```
- ✅ **Implement soft deletes** when data recovery is needed
  ```javascript
  // Add deleted_at column
  await User.destroy({ where: { id }, paranoid: true });
  ```
- ✅ **Use migrations** for schema changes
  ```typescript
  // Never modify database directly in production
  // migrations/001_create_users_table.ts
  // IMPORTANT: Always use UUIDs, never auto-increment integers
  exports.up = (knex) => {
    return knex.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('email').unique().notNullable();
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    });
  };
  ```
- ✅ **Implement database backups**
  ```bash
  # Automated daily backups
  0 2 * * * pg_dump -U postgres dbname > backup_$(date +\%Y\%m\%d).sql
  ```
- ✅ **Use appropriate data types**
  ```sql
  -- Good
  price DECIMAL(10, 2) -- For money
  created_at TIMESTAMP WITH TIME ZONE -- For dates
  is_active BOOLEAN -- For flags
  
  -- Bad
  price VARCHAR(255) -- Don't store numbers as strings
  created_at VARCHAR(255) -- Don't store dates as strings
  ```

### Error Handling
- ✅ **Use try-catch blocks** for async operations
  ```javascript
  async function getUser(id) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Database error:', error);
      throw new DatabaseError('Failed to retrieve user');
    }
  }
  ```
- ✅ **Create custom error classes**
  ```javascript
  class ValidationError extends Error {
    constructor(message, details) {
      super(message);
      this.name = 'ValidationError';
      this.statusCode = 422;
      this.details = details;
    }
  }
  
  class NotFoundError extends Error {
    constructor(message) {
      super(message);
      this.name = 'NotFoundError';
      this.statusCode = 404;
    }
  }
  ```
- ✅ **Centralized error handling middleware**
  ```javascript
  app.use((err, req, res, next) => {
    logger.error(err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      error: {
        code: err.name,
        message: statusCode === 500 ? 'Internal Server Error' : message,
        details: err.details,
        requestId: req.id
      }
    });
  });
  ```
- ✅ **Log errors with context**
  ```javascript
  logger.error('Failed to create user', {
    error: error.message,
    stack: error.stack,
    userId: req.user?.id,
    requestId: req.id,
    body: sanitizeForLogs(req.body)
  });
  ```

### Logging & Monitoring
- ✅ **Use structured logging**
  ```javascript
  const winston = require('winston');
  
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  });
  ```
- ✅ **Log levels appropriately**
  ```javascript
  logger.error('Critical failure'); // Immediate attention needed
  logger.warn('Unusual activity'); // Should be investigated
  logger.info('User logged in'); // Normal operations
  logger.debug('Query executed'); // Detailed debugging
  ```
- ✅ **Include request IDs** for tracing
  ```javascript
  app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
  });
  ```
- ✅ **Monitor application metrics**
  - Response times
  - Error rates
  - Database query performance
  - Memory usage
  - CPU usage
- ✅ **Implement health check endpoints**
  ```javascript
  app.get('/health', async (req, res) => {
    const health = {
      uptime: process.uptime(),
      timestamp: Date.now(),
      checks: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        externalApi: await checkExternalApi()
      }
    };
    
    const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
    res.status(isHealthy ? 200 : 503).json(health);
  });
  ```

### Performance
- ✅ **Cache frequently accessed data**
  ```javascript
  const redis = require('redis');
  const client = redis.createClient();
  
  async function getUser(id) {
    const cached = await client.get(`user:${id}`);
    if (cached) return JSON.parse(cached);
    
    const user = await User.findById(id);
    await client.setEx(`user:${id}`, 3600, JSON.stringify(user));
    return user;
  }
  ```
- ✅ **Use database query optimization**
  ```javascript
  // Bad - N+1 query problem
  const users = await User.findAll();
  for (const user of users) {
    user.posts = await Post.findAll({ where: { userId: user.id } });
  }
  
  // Good - eager loading
  const users = await User.findAll({
    include: [{ model: Post, as: 'posts' }]
  });
  ```
- ✅ **Implement pagination**
  ```javascript
  async function getUsers(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.findAll({ limit, offset, order: [['created_at', 'DESC']] }),
      User.count()
    ]);
    
    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  ```
- ✅ **Use async/parallel processing** when possible
  ```javascript
  // Sequential (slow)
  const user = await getUser(id);
  const posts = await getPosts(id);
  const comments = await getComments(id);
  
  // Parallel (fast)
  const [user, posts, comments] = await Promise.all([
    getUser(id),
    getPosts(id),
    getComments(id)
  ]);
  ```
- ✅ **Implement background jobs** for heavy tasks
  ```javascript
  const Queue = require('bull');
  const emailQueue = new Queue('email');
  
  // Add to queue instead of processing immediately
  emailQueue.add({ to: user.email, template: 'welcome' });
  
  // Process in background
  emailQueue.process(async (job) => {
    await sendEmail(job.data);
  });
  ```
- ✅ **Use compression** for responses
  ```javascript
  const compression = require('compression');
  app.use(compression());
  ```

### Code Organization
- ✅ **Layer your architecture**
  ```
  src/
  ├── controllers/     # Handle HTTP requests/responses
  ├── services/        # Business logic
  ├── repositories/    # Data access layer
  ├── models/          # Database models/schemas
  ├── middleware/      # Express middleware
  ├── utils/           # Helper functions
  ├── validators/      # Input validation schemas
  ├── config/          # Configuration
  └── tests/           # Test files
  ```
- ✅ **Use dependency injection**
  ```javascript
  // Good - testable, flexible
  class UserService {
    constructor(userRepository, emailService) {
      this.userRepository = userRepository;
      this.emailService = emailService;
    }
    
    async createUser(data) {
      const user = await this.userRepository.create(data);
      await this.emailService.sendWelcome(user.email);
      return user;
    }
  }
  ```
- ✅ **Keep controllers thin**
  ```javascript
  // Controller only handles HTTP concerns
  async function createUser(req, res, next) {
    try {
      const userData = req.body;
      const user = await userService.createUser(userData);
      res.status(201).json({ data: user });
    } catch (error) {
      next(error);
    }
  }
  ```

## DON'Ts ❌

### Security
- ❌ **Don't hardcode secrets**
  ```javascript
  // Bad
  const API_KEY = 'sk_live_abc123xyz';
  
  // Good
  const API_KEY = process.env.STRIPE_API_KEY;
  ```
- ❌ **Don't return sensitive data**
  ```javascript
  // Bad
  res.json({ user: userFromDB }); // Includes password hash!
  
  // Good
  const { password, ...safeUser } = userFromDB;
  res.json({ user: safeUser });
  ```
- ❌ **Don't use MD5 or SHA1** for passwords (use bcrypt/argon2)
- ❌ **Don't trust user input** - Always validate
- ❌ **Don't expose stack traces** in production
  ```javascript
  // Bad in production
  res.status(500).json({ error: error.stack });
  
  // Good
  logger.error(error.stack);
  res.status(500).json({ error: 'Internal Server Error' });
  ```
- ❌ **Don't use weak JWT secrets** - Use strong random strings
- ❌ **Don't disable security features** for convenience
  ```javascript
  // Bad
  app.use(cors({ origin: '*' })); // Allows all origins
  
  // Good
  app.use(cors({ origin: allowedOrigins }));
  ```
- ❌ **Don't log passwords or tokens**
  ```javascript
  // Bad
  logger.info('User login', { email, password });
  
  // Good
  logger.info('User login', { email });
  ```
- ❌ **Don't use `eval()` or `Function()` with user input**
- ❌ **Don't use sequential IDs** for sensitive resources (use UUIDs)

### Database
- ❌ **Don't use `SELECT *`** - Specify needed columns
  ```sql
  -- Bad
  SELECT * FROM users WHERE id = 1;
  
  -- Good
  SELECT id, name, email FROM users WHERE id = 1;
  ```
- ❌ **Don't create indexes on every column** - Only on queried fields
- ❌ **Don't ignore query performance** - Use EXPLAIN
- ❌ **Don't make database calls in loops**
  ```javascript
  // Bad - N queries
  for (const userId of userIds) {
    await User.findById(userId);
  }
  
  // Good - 1 query
  await User.findAll({ where: { id: userIds } });
  ```
- ❌ **Don't use ORM for complex queries** - Use raw SQL when needed
- ❌ **Don't ignore database constraints** - Use foreign keys, unique constraints
- ❌ **Don't modify production data manually** - Use migrations/scripts
- ❌ **Don't forget to close database connections**

### API Design
- ❌ **Don't use verbs in URLs**
  ```
  Bad:  POST /api/v1/createUser
  Good: POST /api/v1/users
  ```
- ❌ **Don't return unbounded lists**
  ```javascript
  // Bad - could return millions of records
  app.get('/users', async (req, res) => {
    const users = await User.findAll();
    res.json(users);
  });
  
  // Good - always paginate
  app.get('/users', async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const users = await User.findAll({ limit, offset: (page - 1) * limit });
    res.json({ data: users, meta: { page, limit } });
  });
  ```
- ❌ **Don't use inconsistent naming**
  ```javascript
  // Bad - inconsistent
  GET  /api/v1/user
  POST /api/v1/users
  GET  /api/v1/userProfile
  
  // Good - consistent
  GET  /api/v1/users
  POST /api/v1/users
  GET  /api/v1/users/:id/profile
  ```
- ❌ **Don't ignore API versioning** - Breaking changes need new versions
- ❌ **Don't return HTML errors** from JSON APIs
- ❌ **Don't use HTTP 200** for errors
  ```javascript
  // Bad
  res.json({ success: false, error: 'Not found' }); // Returns 200
  
  // Good
  res.status(404).json({ error: 'Not found' });
  ```

### Code Quality
- ❌ **Don't repeat code** - Extract to functions/modules
- ❌ **Don't use magic numbers**
  ```javascript
  // Bad
  if (user.age < 18) { }
  
  // Good
  const MIN_AGE = 18;
  if (user.age < MIN_AGE) { }
  ```
- ❌ **Don't write giant functions** - Keep under 50 lines
- ❌ **Don't ignore errors**
  ```javascript
  // Bad
  try {
    await riskyOperation();
  } catch (e) {
    // Silent failure
  }
  
  // Good
  try {
    await riskyOperation();
  } catch (error) {
    logger.error('Operation failed', { error });
    throw error; // Or handle appropriately
  }
  ```
- ❌ **Don't use callbacks** (use async/await instead)
- ❌ **Don't leave commented-out code** - Delete it (it's in git)
- ❌ **Don't use abbreviations** - Write readable variable names
  ```javascript
  // Bad
  const usrCnt = users.length;
  
  // Good
  const userCount = users.length;
  ```

### Performance
- ❌ **Don't block the event loop**
  ```javascript
  // Bad - blocks for heavy CPU work
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
  
  // Good - offload to worker thread or cache
  const memoize = require('memoizee');
  const fibonacci = memoize((n) => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  });
  ```
- ❌ **Don't make unnecessary database queries**
- ❌ **Don't load entire files into memory** - Use streams
  ```javascript
  // Bad - loads entire file
  const data = fs.readFileSync('large-file.json');
  
  // Good - streams data
  const stream = fs.createReadStream('large-file.json');
  stream.pipe(parser).pipe(processor);
  ```
- ❌ **Don't ignore caching opportunities**
- ❌ **Don't synchronously process async operations**

## Architecture Patterns

### Layered Architecture
```
┌─────────────────────────────┐
│      Controllers            │  <- HTTP layer
├─────────────────────────────┤
│      Services               │  <- Business logic
├─────────────────────────────┤
│      Repositories           │  <- Data access
├─────────────────────────────┤
│      Models/Entities        │  <- Data structures
└─────────────────────────────┘
```

**Implementation:**
```javascript
// Controller (routes/users.js)
router.post('/', async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
});

// Service (services/userService.js)
class UserService {
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
  }
  
  async createUser(userData) {
    // Validation
    const validatedData = await validateUserData(userData);
    
    // Business logic
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);
    const user = await this.userRepository.create({
      ...validatedData,
      password: hashedPassword
    });
    
    // Side effects
    await this.emailService.sendWelcome(user.email);
    
    return this.sanitizeUser(user);
  }
  
  sanitizeUser(user) {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}

// Repository (repositories/userRepository.js)
class UserRepository {
  constructor(db) {
    this.db = db;
  }
  
  async create(userData) {
    return await this.db.User.create(userData);
  }
  
  async findByEmail(email) {
    return await this.db.User.findOne({ where: { email } });
  }
  
  async findById(id) {
    return await this.db.User.findByPk(id);
  }
}
```

### Microservices Best Practices
```javascript
// Service communication
class OrderService {
  async createOrder(orderData) {
    const order = await this.orderRepository.create(orderData);
    
    // Publish event for other services
    await eventBus.publish('order.created', {
      orderId: order.id,
      userId: order.userId,
      total: order.total
    });
    
    return order;
  }
}

// Inventory service listens
eventBus.subscribe('order.created', async (event) => {
  await inventoryService.reserveItems(event.orderId);
});

// Notification service listens
eventBus.subscribe('order.created', async (event) => {
  await notificationService.sendOrderConfirmation(event.userId);
});
```

### Repository Pattern
```javascript
class BaseRepository {
  constructor(model) {
    this.model = model;
  }
  
  async findAll(filter = {}, options = {}) {
    return await this.model.findAll({
      where: filter,
      ...options
    });
  }
  
  async findById(id) {
    return await this.model.findByPk(id);
  }
  
  async create(data) {
    return await this.model.create(data);
  }
  
  async update(id, data) {
    const record = await this.findById(id);
    if (!record) throw new NotFoundError();
    return await record.update(data);
  }
  
  async delete(id) {
    const record = await this.findById(id);
    if (!record) throw new NotFoundError();
    return await record.destroy();
  }
}

// Extend for specific models
class UserRepository extends BaseRepository {
  constructor(db) {
    super(db.User);
  }
  
  async findByEmail(email) {
    return await this.model.findOne({ where: { email } });
  }
  
  async findActiveUsers() {
    return await this.model.findAll({ where: { isActive: true } });
  }
}
```

## Testing Best Practices

### Unit Tests
```javascript
describe('UserService', () => {
  let userService;
  let mockUserRepository;
  let mockEmailService;
  
  beforeEach(() => {
    mockUserRepository = {
      create: jest.fn(),
      findByEmail: jest.fn()
    };
    mockEmailService = {
      sendWelcome: jest.fn()
    };
    userService = new UserService(mockUserRepository, mockEmailService);
  });
  
  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = { email: 'test@example.com', password: 'password123' };
      mockUserRepository.create.mockResolvedValue({ 
        id: 1, 
        email: userData.email,
        password: 'hashed_password'
      });
      
      const user = await userService.createUser(userData);
      
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(user.password).toBeUndefined(); // Should be sanitized
    });
    
    it('should throw error if email exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 1 });
      
      await expect(userService.createUser({ 
        email: 'exists@example.com' 
      })).rejects.toThrow(ConflictError);
    });
  });
});
```

### Integration Tests
```javascript
describe('POST /api/v1/users', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.email).toBe('newuser@example.com');
    expect(response.body.data.password).toBeUndefined();
  });
  
  it('should return 422 for invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({
        email: 'invalid-email',
        password: 'SecurePass123!'
      });
    
    expect(response.status).toBe(422);
    expect(response.body.error).toHaveProperty('details');
  });
});
```

### Testing Checklist
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] Database transaction tests
- [ ] Authentication/authorization tests
- [ ] Error handling tests
- [ ] Edge cases and boundary conditions
- [ ] Mock external services
- [ ] Test data cleanup (beforeEach/afterEach)

## Authentication & Authorization

### JWT Implementation
```javascript
// Generate tokens
function generateTokens(user) {
  const payload = { userId: user.id, email: user.email };
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });
  
  const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, {
    expiresIn: '7d'
  });
  
  return { accessToken, refreshToken };
}

// Verify middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Authorization middleware
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated'
      });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Usage
app.post('/api/v1/admin/users', 
  authenticate, 
  authorize('admin'), 
  createUser
);
```

### OAuth 2.0 Pattern
```javascript
// Authorization endpoint
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, scope, state } = req.query;
  
  // Validate client
  const client = await getClient(client_id);
  if (!client) return res.status(400).json({ error: 'Invalid client' });
  
  // Show consent screen
  res.render('consent', { client, scope, state });
});

// Token endpoint
app.post('/oauth/token', async (req, res) => {
  const { grant_type, code, client_id, client_secret } = req.body;
  
  // Validate grant
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'Unsupported grant type' });
  }
  
  // Verify authorization code
  const authCode = await verifyAuthCode(code, client_id, client_secret);
  if (!authCode) {
    return res.status(400).json({ error: 'Invalid authorization code' });
  }
  
  // Generate tokens
  const tokens = generateTokens(authCode.user);
  res.json(tokens);
});
```

## Database Patterns

### Schema Design Example (PostgreSQL)
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'cancelled'))
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order items (many-to-many)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

### Query Optimization
```javascript
// Bad - N+1 problem
const users = await User.findAll();
for (const user of users) {
  user.orders = await Order.findAll({ where: { userId: user.id } });
}

// Good - Single query with join
const users = await User.findAll({
  include: [{
    model: Order,
    as: 'orders',
    include: [{ model: OrderItem, as: 'items' }]
  }]
});

// Even better - Paginate and select only needed fields
const users = await User.findAll({
  attributes: ['id', 'name', 'email'],
  include: [{
    model: Order,
    as: 'orders',
    attributes: ['id', 'total', 'status'],
    where: { status: 'completed' },
    required: false // LEFT JOIN instead of INNER JOIN
  }],
  limit: 20,
  offset: 0,
  order: [['created_at', 'DESC']]
});
```

## Deployment & DevOps

### Environment Configuration
```javascript
// config/index.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10
    }
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  },
  cors: {
    origins: process.env.ALLOWED_ORIGINS?.split(',') || []
  }
};
```

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## API Documentation

### OpenAPI/Swagger Example
```javascript
/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
```

## Performance Monitoring

### Application Metrics
```javascript
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

## Cursor-Based Pagination (Not OFFSET)

**RULE: Never use OFFSET/LIMIT for large datasets. Use cursor-based (seek) pagination.**

### Why OFFSET Kills Performance
```sql
-- OFFSET 1000000 must scan 1,000,000 rows before returning 20
-- This gets slower and slower as offset increases
SELECT * FROM events ORDER BY created_at DESC LIMIT 20 OFFSET 1000000;

-- EXPLAIN shows: Seq Scan on events, 1000020 rows fetched
```

### The Right Way: Cursor Pagination
```typescript
// Use the last item's timestamp/id as cursor
interface PaginationParams {
  limit: number;
  cursor?: string; // ISO timestamp or ID
}

async function getEvents({ limit = 20, cursor }: PaginationParams) {
  let query = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1); // Fetch 1 extra to check if more exist

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  
  const hasMore = data && data.length > limit;
  const items = hasMore ? data.slice(0, -1) : data;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return {
    data: items,
    meta: {
      hasMore,
      nextCursor,
    },
  };
}

// API response format
{
  "data": [...],
  "meta": {
    "hasMore": true,
    "nextCursor": "2025-01-15T10:30:00Z"
  }
}
```

### Keyset Pagination with Composite Keys
```sql
-- For ties in created_at, use id as tiebreaker
SELECT * FROM events 
WHERE (created_at, id) < ($cursor_time, $cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

---

## Supabase-Specific Patterns

### Row Level Security (RLS) - Always Enabled
```sql
-- Enable RLS on every table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own events
CREATE POLICY "Users see own events" ON events
  FOR SELECT
  USING (auth.uid() = created_by);

-- Users can only update their own events
CREATE POLICY "Users update own events" ON events
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Admins can see all events
CREATE POLICY "Admins see all" ON events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

### SQL Functions: SECURITY INVOKER vs DEFINER
```sql
-- SECURITY INVOKER (default, recommended): Respects RLS of calling user
CREATE OR REPLACE FUNCTION get_nearby_events(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 10
)
RETURNS SETOF events
LANGUAGE sql
SECURITY INVOKER  -- Uses caller's RLS policies
AS $$
  SELECT * FROM events
  WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY ST_Distance(
    location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  );
$$;

-- SECURITY DEFINER: Bypasses RLS (use sparingly!)
-- Only for system operations like triggers or admin functions
CREATE OR REPLACE FUNCTION update_attendee_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with function owner's permissions
AS $$
BEGIN
  UPDATE events SET attendees_count = (
    SELECT COUNT(*) FROM attendees WHERE event_id = NEW.event_id
  ) WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;
```

### PostGIS for Location Queries (Not Haversine in JS)
```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to events
ALTER TABLE events ADD COLUMN location geography(POINT, 4326);

-- Create spatial index (critical for performance)
CREATE INDEX idx_events_location ON events USING GIST(location);

-- Query events within 10km radius
SELECT 
  id, 
  title,
  ST_Distance(location, ST_MakePoint(-73.9857, 40.7484)::geography) as distance_meters
FROM events
WHERE ST_DWithin(
  location,
  ST_MakePoint(-73.9857, 40.7484)::geography,  -- lng, lat order!
  10000  -- 10km in meters
)
ORDER BY distance_meters;
```

### Supabase Edge Functions
```typescript
// supabase/functions/send-notification/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  // Verify JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { eventId, message } = await req.json();

  // Send notification logic...
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Supabase TypeScript Types
```typescript
// Always generate types from your schema
// npx supabase gen types typescript --project-id <id> > database.types.ts

import { Database } from '@/types/database.types';

type Event = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];

// Use with Supabase client
const supabase = createClient<Database>(url, key);

// Now fully typed!
const { data } = await supabase
  .from('events')
  .select('id, title, created_at')
  .eq('status', 'published');  // TypeScript validates column names
```

---

## Related Skills

For foundational principles and frontend patterns, see:

- **[Fundamental Principles](../Fundamentals/SKILL.md)** - Core coding principles, error handling, immutability
- **[Frontend Patterns](../Frontend/SKILL.md)** - React, state management, UI components

---

## Summary Checklist

**Before deploying to production:**
- [ ] All secrets in environment variables
- [ ] Input validation on all endpoints
- [ ] Authentication & authorization implemented
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] CORS configured properly
- [ ] Error handling with proper logging
- [ ] Database indexes created
- [ ] Database backups automated
- [ ] API versioning implemented
- [ ] Health check endpoint exists
- [ ] Monitoring/alerting configured
- [ ] Load testing completed
- [ ] Security headers set
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] Dependency vulnerabilities checked
- [ ] Documentation complete
- [ ] Tests passing (unit + integration)
- [ ] Deployment rollback plan ready

---

**Remember:** Security, performance, and maintainability should be built in from the start, not added later. Write code that your future self will thank you for.