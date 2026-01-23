---
name: fundamental-coding-principles
description: Essential coding fundamentals and universal principles that transcend frameworks and languages. These are the most important rules that prevent bugs, ensure maintainability, and make you a better developer. Master these before anything else.
tools: ['vscode', 'execute', 'read', 'edit', 'search', 'web', 'supabase/*', 'sequential-thinking/*', 'agent', 'ms-vscode.vscode-websearchforcopilot/websearch', 'todo']
---

# Fundamental Coding Principles - The Foundation

## The Golden Rules (Non-Negotiable)

### 1. **Never Trust Anything**
The single most important principle in all of software development.

```javascript
// ALWAYS validate and check
function getUser(id) {
  // ❌ DANGEROUS - Assumes everything exists
  return database.users[id].name;
  
  // ✅ SAFE - Check every step
  if (!id) return null;
  if (!database) return null;
  if (!database.users) return null;
  if (!database.users[id]) return null;
  return database.users[id].name || null;
  
  // ✅ BETTER - Use optional chaining
  return database?.users?.[id]?.name ?? null;
}

// ❌ DANGEROUS
const data = JSON.parse(response);

// ✅ SAFE
let data;
try {
  data = JSON.parse(response);
} catch (error) {
  logger.error('Invalid JSON:', error);
  return null;
}

// ❌ DANGEROUS - Assumes array has items
const first = items[0];

// ✅ SAFE
const first = items && items.length > 0 ? items[0] : null;
```

**Why it matters:** 90% of production bugs come from not checking if something exists before using it.

### 2. **Fail Early, Fail Loudly**
Don't let errors propagate. Catch them immediately at the source.

```javascript
// ❌ BAD - Silent failure, error happens later
function processOrder(order) {
  // No validation
  const total = order.items.reduce((sum, item) => sum + item.price, 0);
  // Crashes later when order.items is undefined
}

// ✅ GOOD - Fail immediately with clear message
function processOrder(order) {
  if (!order) {
    throw new Error('Order is required');
  }
  if (!order.items || !Array.isArray(order.items)) {
    throw new Error('Order must have items array');
  }
  if (order.items.length === 0) {
    throw new Error('Order cannot be empty');
  }
  
  const total = order.items.reduce((sum, item) => {
    if (!item.price || typeof item.price !== 'number') {
      throw new Error(`Invalid price for item: ${JSON.stringify(item)}`);
    }
    return sum + item.price;
  }, 0);
  
  return total;
}
```

**Why it matters:** Finding bugs 10 lines away from where they occur is 100x harder than catching them immediately.

### 3. **One Function, One Job**
The Single Responsibility Principle - the most violated and most important rule.

```javascript
// ❌ BAD - Does everything
function handleUserRegistration(email, password, name) {
  // Validates
  if (!email.includes('@')) return { error: 'Invalid email' };
  if (password.length < 8) return { error: 'Password too short' };
  
  // Hashes password
  const hash = bcrypt.hashSync(password, 10);
  
  // Saves to database
  const user = db.users.insert({ email, password: hash, name });
  
  // Sends email
  smtp.send({
    to: email,
    subject: 'Welcome',
    body: 'Thanks for signing up'
  });
  
  // Logs
  console.log('User registered:', email);
  
  // Returns
  return { success: true, user };
}

// ✅ GOOD - Each function has ONE job
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required');
  }
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
  return email.toLowerCase().trim();
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return password;
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function createUser(email, passwordHash, name) {
  return db.users.insert({ 
    email, 
    password: passwordHash, 
    name,
    createdAt: new Date()
  });
}

function sendWelcomeEmail(email) {
  return smtp.send({
    to: email,
    subject: 'Welcome',
    body: 'Thanks for signing up'
  });
}

// Main function just orchestrates
async function registerUser(email, password, name) {
  const validEmail = validateEmail(email);
  const validPassword = validatePassword(password);
  const passwordHash = hashPassword(validPassword);
  
  const user = await createUser(validEmail, passwordHash, name);
  await sendWelcomeEmail(validEmail);
  
  logger.info('User registered', { userId: user.id });
  
  return user;
}
```

**Why it matters:** Small, focused functions are easy to test, debug, reuse, and understand.

### 4. **Make Illegal States Impossible**
Use types and data structures to prevent bugs at compile time.

```javascript
// ❌ BAD - Many invalid states possible
const order = {
  status: 'shipped',  // But no tracking number?
  trackingNumber: null,
  shippedAt: null,    // Shipped but no timestamp?
  isPaid: false       // Shipped but not paid?
};

// ✅ GOOD - TypeScript makes invalid states impossible
type PendingOrder = {
  status: 'pending';
  isPaid: boolean;
};

type ShippedOrder = {
  status: 'shipped';
  trackingNumber: string;  // MUST have tracking number
  shippedAt: Date;         // MUST have timestamp
  isPaid: true;            // MUST be paid
};

type CancelledOrder = {
  status: 'cancelled';
  cancelledAt: Date;
  reason: string;
};

type Order = PendingOrder | ShippedOrder | CancelledOrder;

// Now this is impossible:
const invalid: Order = {
  status: 'shipped',
  trackingNumber: null  // TypeScript error!
};
```

**Why it matters:** Bugs you prevent at compile time never make it to production.

### 5. **Immutability - Never Modify, Always Copy**
Most insidious bugs come from unexpected mutations.

```javascript
// ❌ DANGEROUS - Mutates original
function addDiscount(cart, discount) {
  cart.total = cart.total - discount;  // Modifies original!
  return cart;
}

const myCart = { total: 100 };
const discountedCart = addDiscount(myCart, 10);
console.log(myCart.total);  // 90 - SURPRISE! Original changed

// ✅ SAFE - Returns new object
function addDiscount(cart, discount) {
  return {
    ...cart,
    total: cart.total - discount
  };
}

const myCart = { total: 100 };
const discountedCart = addDiscount(myCart, 10);
console.log(myCart.total);  // 100 - Original unchanged

// ❌ DANGEROUS - Array mutation
function addItem(items, newItem) {
  items.push(newItem);  // Modifies original!
  return items;
}

// ✅ SAFE - New array
function addItem(items, newItem) {
  return [...items, newItem];
}

// ❌ DANGEROUS - Deep object mutation
user.profile.settings.notifications.email = false;

// ✅ SAFE - Immutable update
const updatedUser = {
  ...user,
  profile: {
    ...user.profile,
    settings: {
      ...user.profile.settings,
      notifications: {
        ...user.profile.settings.notifications,
        email: false
      }
    }
  }
};
```

**Why it matters:** Debugging mutated state is one of the hardest problems in programming.

### 6. **Explicit is Better Than Implicit**
Code should say exactly what it does.

```javascript
// ❌ BAD - Implicit behavior
function getUsers() {
  return db.query('SELECT * FROM users');  // Are deleted users included?
}

// ✅ GOOD - Explicit
function getAllUsers() {  // Clear: includes everything
  return db.query('SELECT * FROM users');
}

function getActiveUsers() {  // Clear: only active
  return db.query('SELECT * FROM users WHERE deleted_at IS NULL');
}

// ❌ BAD - Magic numbers
if (status === 1) { }

// ✅ GOOD - Named constants
const STATUS_ACTIVE = 1;
if (status === STATUS_ACTIVE) { }

// ❌ BAD - Boolean parameters
sendEmail(user, true, false, true);

// ✅ GOOD - Named parameters
sendEmail(user, {
  includeAttachment: true,
  isUrgent: false,
  trackOpens: true
});

// ❌ BAD - Implicit conversion
if (value) { }  // What if value is 0 or ""?

// ✅ GOOD - Explicit check
if (value !== null && value !== undefined) { }
if (typeof value === 'string' && value.length > 0) { }
```

**Why it matters:** Reading code is 10x more common than writing it.

### 7. **Guard Clauses - Exit Early**
Reduce nesting, improve readability.

```javascript
// ❌ BAD - Deep nesting (arrow of doom)
function processPayment(user, amount) {
  if (user) {
    if (user.isActive) {
      if (amount > 0) {
        if (user.balance >= amount) {
          // Actual logic buried 4 levels deep
          // ❌ Also mutates directly - double bad!
          user.balance -= amount;
          return { success: true };
        } else {
          return { error: 'Insufficient balance' };
        }
      } else {
        return { error: 'Invalid amount' };
      }
    } else {
      return { error: 'User inactive' };
    }
  } else {
    return { error: 'User not found' };
  }
}

// ✅ GOOD - Guard clauses
function processPayment(user, amount) {
  // Exit early for bad cases
  if (!user) {
    return { error: 'User not found' };
  }
  
  if (!user.isActive) {
    return { error: 'User inactive' };
  }
  
  if (amount <= 0) {
    return { error: 'Invalid amount' };
  }
  
  if (user.balance < amount) {
    return { error: 'Insufficient balance' };
  }
  
  // Happy path at the lowest nesting level
  // Return new state immutably - never mutate input!
  return { 
    success: true, 
    newBalance: user.balance - amount 
  };
}
```

**Why it matters:** Flat code is easier to read and modify.

### 8. **Naming - Code is Communication**
Good names eliminate the need for comments.

```javascript
// ❌ BAD - Cryptic names
function calc(a, b, c) {
  const x = a * b;
  const y = x * c;
  return y;
}

// ✅ GOOD - Self-documenting
function calculateTotalPrice(itemPrice, quantity, taxRate) {
  const subtotal = itemPrice * quantity;
  const total = subtotal * (1 + taxRate);
  return total;
}

// ❌ BAD - Abbreviations
const usr = getUsr(id);
const addr = usr.addr;

// ✅ GOOD - Full words
const user = getUser(id);
const address = user.address;

// ❌ BAD - Vague names
function process(data) { }
function handle(item) { }
function doStuff() { }

// ✅ GOOD - Descriptive names
function validateUserEmail(email) { }
function sendWelcomeEmail(user) { }
function calculateShippingCost(order) { }

// ❌ BAD - Misleading names
function getUsers() {
  const users = db.query('SELECT * FROM users');
  users.forEach(user => sendEmail(user));  // ALSO sends emails!
  return users;
}

// ✅ GOOD - Name matches behavior
function getUsersAndNotify() {
  const users = db.query('SELECT * FROM users');
  users.forEach(user => sendEmail(user));
  return users;
}
```

**Naming Conventions:**
- **Functions/Methods:** Verbs - `getUser()`, `calculateTotal()`, `sendEmail()`
- **Booleans:** Questions - `isActive`, `hasPermission`, `canEdit`
- **Collections:** Plural - `users`, `orders`, `items`
- **Constants:** SCREAMING_SNAKE_CASE - `MAX_RETRY_COUNT`
- **Classes:** Nouns - `User`, `OrderProcessor`, `EmailService`

### 9. **DRY - But Don't Repeat Logic, Not Code**
Don't abstract too early. Wait for the pattern to emerge.

```javascript
// ❌ PREMATURE ABSTRACTION - Code looks similar but isn't
function validateUser(user) {
  if (!user.email) throw new Error('Email required');
  if (!user.password) throw new Error('Password required');
}

function validateProduct(product) {
  if (!product.name) throw new Error('Name required');
  if (!product.price) throw new Error('Price required');
}

// Looks similar, but requirements will diverge
// Don't combine them yet!

// ✅ AFTER 3rd OCCURRENCE - Now abstract
// After you have validateOrder, validatePayment, etc.
// Then you see the real pattern:
function validateRequired(obj, fields, entityName) {
  fields.forEach(field => {
    if (!obj[field]) {
      throw new Error(`${entityName} ${field} is required`);
    }
  });
}

validateRequired(user, ['email', 'password'], 'User');
validateRequired(product, ['name', 'price'], 'Product');
```

**Rule of Three:** Don't abstract until you've written it three times.

### 10. **Error Handling - No Silent Failures**

```javascript
// ❌ CATASTROPHIC - Swallows errors
try {
  await criticalOperation();
} catch (e) {
  // Silent failure - looks like success!
}

// ❌ BAD - Generic handling
try {
  await saveUser(user);
} catch (error) {
  console.log('Error');  // Which error? What context?
}

// ✅ GOOD - Specific handling
try {
  await saveUser(user);
} catch (error) {
  logger.error('Failed to save user', {
    userId: user.id,
    error: error.message,
    stack: error.stack
  });
  
  // Handle specific errors differently
  if (error.code === 'DUPLICATE_EMAIL') {
    throw new ConflictError('Email already exists');
  }
  
  if (error.code === 'DB_CONNECTION') {
    throw new DatabaseError('Database unavailable');
  }
  
  // Re-throw unknown errors
  throw error;
}

// ✅ MODERN - Use Error cause chain (ES2022+)
async function saveUser(user) {
  try {
    return await db.users.insert(user);
  } catch (error) {
    // Chain the original error as cause
    throw new Error('Failed to save user', { 
      cause: error  // Original error preserved for debugging
    });
  }
}

// ✅ EVEN BETTER - Custom error with context
class DatabaseError extends Error {
  constructor(message, { cause, context } = {}) {
    super(message);
    this.name = 'DatabaseError';
    this.cause = cause;
    this.context = context;
  }
}

async function saveUser(user) {
  try {
    return await db.users.insert(user);
  } catch (error) {
    throw new DatabaseError('Failed to save user', {
      cause: error,
      context: { userId: user.id, email: user.email }
    });
  }
}
```

### 11. **Don't Repeat Yourself... in Data**
The source of truth should be singular.

```javascript
// ❌ BAD - Duplicate data, can become inconsistent
const order = {
  items: [
    { price: 10, quantity: 2 },
    { price: 15, quantity: 1 }
  ],
  subtotal: 35,  // Calculated value stored
  tax: 3.5,      // Calculated value stored
  total: 38.5    // Calculated value stored
};

// Now if items change, must remember to update all three!

// ✅ GOOD - Calculate on demand
const order = {
  items: [
    { price: 10, quantity: 2 },
    { price: 15, quantity: 1 }
  ],
  get subtotal() {
    return this.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
  },
  get tax() {
    return this.subtotal * 0.1;
  },
  get total() {
    return this.subtotal + this.tax;
  }
};

// ❌ BAD - User data duplicated
const post = {
  userId: 123,
  userName: 'John',      // Duplicate!
  userEmail: 'j@x.com'   // Duplicate!
};

// ✅ GOOD - Reference, don't duplicate
const post = {
  userId: 123  // Only store ID
};

// Fetch user when needed
const user = await getUser(post.userId);
```

### 12. **Defensive Programming**

```javascript
// ALWAYS validate function inputs

// ❌ BAD - Assumes inputs are valid
function divideBad(a, b) {
  return a / b;  // No validation!
}

// ✅ GOOD - Validates everything
function divide(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Both arguments must be numbers');
  }
  
  if (!isFinite(a) || !isFinite(b)) {
    throw new Error('Arguments must be finite numbers');
  }
  
  if (b === 0) {
    throw new Error('Division by zero');
  }
  
  return a / b;
}

// ALWAYS check array operations

// ❌ BAD - Assumes array exists and has items
function getFirstBad(array) {
  return array[0];  // Crashes if array is null or empty!
}

// ✅ GOOD - Validates
function getFirst(array) {
  if (!Array.isArray(array)) {
    throw new TypeError('Argument must be an array');
  }
  
  if (array.length === 0) {
    return null;  // Or throw error, depending on requirements
  }
  
  return array[0];
}

// ALWAYS validate database results

// ❌ BAD - Assumes query succeeds
async function getUserBad(id) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return user;  // No validation!
}

// ✅ GOOD - Checks everything
async function getUser(id) {
  if (!id) {
    throw new Error('User ID is required');
  }
  
  let result;
  try {
    result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  } catch (error) {
    throw new DatabaseError('Failed to fetch user', { cause: error });
  }
  
  if (!result || result.length === 0) {
    throw new NotFoundError(`User ${id} not found`);
  }
  
  return result[0];
}
```

## The Most Common Bugs and How to Avoid Them

### Bug #1: Null/Undefined Reference
```javascript
// THE BUG
const name = user.profile.name;  // TypeError: Cannot read property 'name' of undefined

// THE FIX - Check every level
const name = user?.profile?.name ?? 'Unknown';

// OR validate early
if (!user || !user.profile) {
  throw new Error('Invalid user object');
}
const name = user.profile.name;
```

### Bug #2: Off-by-One Errors
```javascript
// THE BUG
for (let i = 0; i <= array.length; i++) {  // <= instead of <
  console.log(array[i]);  // Last iteration: undefined
}

// THE FIX - Use < not <=
for (let i = 0; i < array.length; i++) {
  console.log(array[i]);
}

// BETTER - Use modern iteration
array.forEach(item => console.log(item));
```

### Bug #3: Floating Point Comparison
```javascript
// THE BUG
0.1 + 0.2 === 0.3  // false! (it's 0.30000000000000004)

// THE FIX - Use epsilon comparison
function floatEquals(a, b, epsilon = 0.0001) {
  return Math.abs(a - b) < epsilon;
}

floatEquals(0.1 + 0.2, 0.3)  // true

// OR use integers (for money)
const priceInCents = 1050;  // $10.50
const total = priceInCents * 2;  // 2100 cents = $21.00
```

### Bug #4: Async/Await Gotchas
```javascript
// THE BUG - Sequential instead of parallel
async function getAll() {
  const users = await getUsers();      // Waits 100ms
  const products = await getProducts(); // Waits another 100ms
  // Total: 200ms
}

// THE FIX - Parallel execution
async function getAll() {
  const [users, products] = await Promise.all([
    getUsers(),
    getProducts()
  ]);
  // Total: 100ms
}

// BETTER - Handle partial failures with Promise.allSettled
async function getAllWithPartialFailures() {
  const results = await Promise.allSettled([
    getUsers(),
    getProducts(),
    getOrders()  // This might fail
  ]);
  
  // Process results - some may have failed
  const users = results[0].status === 'fulfilled' ? results[0].value : [];
  const products = results[1].status === 'fulfilled' ? results[1].value : [];
  const orders = results[2].status === 'fulfilled' ? results[2].value : [];
  
  return { users, products, orders };
}

// THE BUG - Forgetting await
async function saveUser(user) {
  db.save(user);  // Forgot await! Returns Promise, doesn't wait
  sendEmail(user);  // Might execute before save completes
}

// THE FIX
async function saveUser(user) {
  await db.save(user);
  await sendEmail(user);
}

// STREAMING DATA - Use for-await-of
async function processStream(readableStream) {
  for await (const chunk of readableStream) {
    await processChunk(chunk);
  }
}
```

### Bug #5: Reference vs Value
```javascript
// THE BUG - Objects are references
const original = { count: 0 };
const copy = original;  // Not a copy! Same reference
copy.count = 5;
console.log(original.count);  // 5 - SURPRISE!

// THE FIX - Shallow copy
const copy = { ...original };

// OR deep copy
const copy = JSON.parse(JSON.stringify(original));
// OR
const copy = structuredClone(original);  // Modern browsers
```

## Critical Debugging Principles

### 1. **Reproduce First**
Never try to fix a bug you can't reproduce.

```javascript
// Write a test that fails
test('should handle empty array', () => {
  const result = processItems([]);
  expect(result).toBe(null);  // Currently fails
});

// Then fix the code
function processItems(items) {
  if (!items || items.length === 0) {
    return null;  // Now test passes
  }
  // ...
}
```

### 2. **Binary Search for Bugs**
Comment out half the code, see if bug persists.

```javascript
// Bug somewhere in this function
function complexOperation() {
  const step1 = doStep1();
  const step2 = doStep2();
  const step3 = doStep3();
  const step4 = doStep4();
  return step4;
}

// Comment out bottom half
function complexOperation() {
  const step1 = doStep1();
  const step2 = doStep2();
  return step2;  // Still crashes? Bug is in step1 or step2
  // const step3 = doStep3();
  // const step4 = doStep4();
  // return step4;
}
```

### 3. **Add Assertions**
Make your assumptions explicit.

```javascript
function calculateDiscount(price, percentage) {
  // Make assumptions explicit
  console.assert(typeof price === 'number', 'Price must be number');
  console.assert(price >= 0, 'Price must be positive');
  console.assert(percentage >= 0 && percentage <= 100, 'Invalid percentage');
  
  const discount = price * (percentage / 100);
  
  console.assert(discount <= price, 'Discount cannot exceed price');
  
  return discount;
}
```

## Code Review Checklist (The Essentials)

Before committing ANY code, ask yourself:

- [ ] **Does it handle null/undefined?** - Check every property access
- [ ] **Does it validate inputs?** - Never trust external data
- [ ] **Does it handle errors?** - No silent failures
- [ ] **Is it testable?** - Can you write a test for it?
- [ ] **Is the function name accurate?** - Does it describe what it does?
- [ ] **Is it too long?** - Over 50 lines? Break it up
- [ ] **Does it have side effects?** - Are they documented?
- [ ] **Can it throw?** - Are errors handled/documented?
- [ ] **Is data mutated?** - Should it be immutable?
- [ ] **Are there magic numbers?** - Extract to named constants

## The Ultimate Rule

**Write code as if you'll be debugging it at 3 AM during a production outage, with no memory of writing it.**

- You will read this at 3 AM during an outage
- You won't have context about why you made certain decisions
- You won't remember your clever tricks
- It needs to be obvious

---

## TypeScript-Specific Patterns

TypeScript is not "JavaScript with types." It's a tool to make illegal states **unrepresentable**.

### Use Generics, Never `any`
```typescript
// ❌ BAD - Defeats TypeScript entirely
function wrap(value: any): any {
  return { value };
}

// ✅ GOOD - Type-safe and reusable
function wrap<T>(value: T): { value: T } {
  return { value };
}

// ❌ BAD - Silences real errors
const data = response as any;

// ✅ GOOD - Validate at runtime, infer types
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});

type User = z.infer<typeof UserSchema>;

const user = UserSchema.parse(response); // Runtime validation + type inference
```

### Type Guards for Narrowing
```typescript
// ❌ BAD - Unsafe type assertion
function processValue(value: string | number) {
  const str = value as string; // Might be number!
  return str.toUpperCase();
}

// ✅ GOOD - Type guard
function processValue(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase(); // TypeScript knows it's string
  }
  return value.toFixed(2); // TypeScript knows it's number
}

// Custom type guard for complex types
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}
```

### Result Types over Exceptions
```typescript
// ❌ BAD - Caller doesn't know it can throw
async function getUser(id: string) {
  const user = await db.find(id);
  if (!user) throw new Error('Not found');
  return user;
}

// ✅ GOOD - Explicit success/failure states
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function getUser(id: string): Promise<Result<User, 'NOT_FOUND' | 'DB_ERROR'>> {
  try {
    const user = await db.find(id);
    if (!user) {
      return { success: false, error: 'NOT_FOUND' };
    }
    return { success: true, data: user };
  } catch {
    return { success: false, error: 'DB_ERROR' };
  }
}

// Caller MUST handle both cases
const result = await getUser('123');
if (!result.success) {
  // Handle error - TypeScript knows result.error exists
  return;
}
// TypeScript knows result.data is User here
```

---

## More Common Bugs

### Bug #6: Closure in Loop (Classic `var` Issue)
```javascript
// THE BUG
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 3, 3, 3 (not 0, 1, 2!)

// THE FIX - Use let (block-scoped)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 0, 1, 2
```

### Bug #7: Event Listener Memory Leaks
```javascript
// THE BUG - Listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Component unmounts, listener keeps running!
}, []);

// THE FIX - Always cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

### Bug #8: Unhandled Promise Rejection
```javascript
// THE BUG - Rejection goes nowhere
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

fetchData(); // If this fails, error is swallowed!

// THE FIX - Always handle or propagate
fetchData()
  .then(data => setData(data))
  .catch(error => {
    logger.error('Fetch failed:', error);
    showErrorToast('Failed to load data');
  });

// OR use global handler as safety net
window.addEventListener('unhandledrejection', event => {
  logger.error('Unhandled rejection:', event.reason);
});
```

### Bug #9: Stale Closure in React
```javascript
// THE BUG - count is stale inside callback
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(count + 1); // Always uses initial count (0)!
    }, 1000);
    return () => clearInterval(interval);
  }, []); // Empty deps = stale closure
  
  return <div>{count}</div>; // Stuck at 1
}

// THE FIX - Use functional update
function CounterFixed() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + 1); // Uses latest value
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return <div>{count}</div>;
}

// ALTERNATIVE FIX - Use useRef for reading (not updating)
function CounterWithRef() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  
  // Keep ref in sync with state
  useEffect(() => {
    countRef.current = count;
  }, [count]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Read from ref - always fresh
      console.log('Current count:', countRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return <div>{count}</div>;
}
```

---

## Async Resource Cleanup

### AbortController for Cancellable Operations
```javascript
// ❌ BAD - Fetch continues even after component unmounts
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// ✅ GOOD - Cancellable fetch
async function fetchUser(id, signal) {
  const response = await fetch(`/api/users/${id}`, { signal });
  return response.json();
}

// Usage in React
useEffect(() => {
  const controller = new AbortController();
  
  fetchUser(userId, controller.signal)
    .then(setUser)
    .catch(error => {
      if (error.name !== 'AbortError') {
        setError(error);
      }
    });
  
  return () => controller.abort();
}, [userId]);
```

### Resource Cleanup Pattern
```javascript
// Pattern: Acquire-Use-Release
async function processFile(path) {
  const handle = await openFile(path);
  try {
    const content = await handle.read();
    return process(content);
  } finally {
    await handle.close(); // ALWAYS runs, even on error
  }
}

// TypeScript 5.2+ using declarations (coming soon to JS)
async function processFile(path) {
  using handle = await openFile(path);
  // handle.close() called automatically when scope exits
  return process(await handle.read());
}
```

---

## Testing Fundamentals

### Arrange-Act-Assert Pattern
```javascript
test('should apply discount correctly', () => {
  // ARRANGE - Set up test data
  const cart = { items: [{ price: 100 }], discount: 0 };
  const discountPercent = 20;
  
  // ACT - Execute the code under test
  const result = applyDiscount(cart, discountPercent);
  
  // ASSERT - Verify the outcome
  expect(result.total).toBe(80);
  expect(result.discount).toBe(20);
});
```

### Test Behavior, Not Implementation
```javascript
// ❌ BAD - Tests implementation details
test('should call formatDate with correct args', () => {
  const spy = jest.spyOn(utils, 'formatDate');
  renderComponent();
  expect(spy).toHaveBeenCalledWith(new Date(), 'MMM DD');
});

// ✅ GOOD - Tests observable behavior
test('should display formatted date to user', () => {
  renderComponent({ date: new Date('2025-01-15') });
  expect(screen.getByText('Jan 15')).toBeInTheDocument();
});
```

### Test Isolation Principle
```javascript
// ❌ BAD - Tests depend on each other
let counter = 0;

test('first test', () => {
  counter++;
  expect(counter).toBe(1);
});

test('second test', () => {
  counter++;
  expect(counter).toBe(2); // Fails if first test doesn't run!
});

// ✅ GOOD - Each test is independent
test('first test', () => {
  const counter = createCounter();
  counter.increment();
  expect(counter.value).toBe(1);
});

test('second test', () => {
  const counter = createCounter();
  counter.increment();
  expect(counter.value).toBe(1); // Same result, independent
});
```

### What to Mock, What Not to Mock
```javascript
// ✅ MOCK: External services, network, time
jest.spyOn(Date, 'now').mockReturnValue(1705333200000);
jest.mock('./emailService');

// ❌ DON'T MOCK: Your own business logic
// If you need to mock it, your code is too coupled

// ✅ STUB: Database for unit tests
const mockDb = { getUser: jest.fn().mockResolvedValue(testUser) };

// ✅ REAL DB: For integration tests
// Use test containers or in-memory SQLite
```

---

## Security Fundamentals

Security is not optional. These patterns prevent the most common vulnerabilities.

### Input Validation - Trust Nothing
```javascript
// ❌ DANGEROUS - Trusts user input
function searchUsers(query) {
  return db.query(`SELECT * FROM users WHERE name LIKE '%${query}%'`);
  // SQL Injection: query = "'; DROP TABLE users; --"
}

// ✅ SAFE - Parameterized queries
function searchUsers(query) {
  return db.query(
    'SELECT * FROM users WHERE name LIKE ?',
    [`%${query}%`]
  );
}

// ❌ DANGEROUS - Renders user HTML
function Comment({ text }) {
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
  // XSS: text = "<script>stealCookies()</script>"
}

// ✅ SAFE - Sanitize or escape
import DOMPurify from 'dompurify';

function Comment({ text }) {
  const clean = DOMPurify.sanitize(text);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// ✅ BETTER - Don't use dangerouslySetInnerHTML at all
function Comment({ text }) {
  return <div>{text}</div>; // React escapes by default
}
```

### Prototype Pollution Prevention
```javascript
// ❌ DANGEROUS - Allows prototype pollution
function merge(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
  return target;
}
// Attack: source = { "__proto__": { "isAdmin": true } }

// ✅ SAFE - Check for dangerous keys
function safeMerge(target, source) {
  const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];
  
  for (const key in source) {
    if (FORBIDDEN_KEYS.includes(key)) {
      continue; // Skip dangerous keys
    }
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }
  return target;
}

// ✅ BETTER - Use Object.assign or spread (safer)
const merged = { ...target, ...source };
```

### Secrets Management
```javascript
// ❌ DANGEROUS - Secrets in client code
const API_KEY = 'sk_live_abc123';  // Visible in browser!

// ❌ DANGEROUS - NEXT_PUBLIC_ exposes to client
const key = process.env.NEXT_PUBLIC_SECRET_KEY;

// ✅ SAFE - Server-side only
// In API route or Server Component
const key = process.env.SECRET_KEY;  // Not exposed to browser

// ✅ SAFE - Use server actions for sensitive operations
'use server';
async function chargeCard(amount) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // Key never leaves server
}
```

### Rate Limiting Awareness
```javascript
// ✅ Handle 429 Too Many Requests
async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url);
    
    if (response.status === 429) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    return response;
  }
  throw new Error('Max retries exceeded');
}
```

---

## Performance Fundamentals

### Debounce and Throttle
```javascript
// ❌ BAD - API call on every keystroke
input.addEventListener('input', (e) => {
  searchAPI(e.target.value);  // 10 keystrokes = 10 API calls!
});

// ✅ GOOD - Debounce: Wait for user to stop typing
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const debouncedSearch = debounce(searchAPI, 300);
input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);  // Only calls after 300ms pause
});

// ✅ GOOD - Throttle: Limit frequency (for scroll/resize)
function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

const throttledScroll = throttle(handleScroll, 100);
window.addEventListener('scroll', throttledScroll);
```

### Avoid Unnecessary Work
```javascript
// ❌ BAD - Recalculates on every render
function ExpensiveList({ items, filter }) {
  const filtered = items.filter(item => 
    item.name.toLowerCase().includes(filter.toLowerCase())
  );
  // Runs even if items/filter haven't changed!
}

// ✅ GOOD - Memoize expensive calculations
function ExpensiveList({ items, filter }) {
  const filtered = useMemo(() => 
    items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    ),
    [items, filter]  // Only recalculate when these change
  );
}

// ❌ BAD - Creates new function on every render
function Parent() {
  return <Child onClick={() => doSomething()} />;
  // Child re-renders every time Parent renders!
}

// ✅ GOOD - Stable function reference
function Parent() {
  const handleClick = useCallback(() => doSomething(), []);
  return <Child onClick={handleClick} />;
}
```

### Big O Awareness
```javascript
// ❌ BAD - O(n²) nested loops
function findDuplicates(array) {
  const duplicates = [];
  for (let i = 0; i < array.length; i++) {
    for (let j = i + 1; j < array.length; j++) {
      if (array[i] === array[j]) {
        duplicates.push(array[i]);
      }
    }
  }
  return duplicates;
}

// ✅ GOOD - O(n) with Set
function findDuplicates(array) {
  const seen = new Set();
  const duplicates = new Set();
  
  for (const item of array) {
    if (seen.has(item)) {
      duplicates.add(item);
    }
    seen.add(item);
  }
  
  return [...duplicates];
}

// Know your complexities:
// Array.includes() - O(n)
// Set.has() - O(1)
// Object property access - O(1)
// Array.sort() - O(n log n)
// Nested loops - O(n²) - AVOID for large arrays
```
const mockDb = { getUser: jest.fn().mockResolvedValue(testUser) };

// ✅ REAL DB: For integration tests
// Use test containers or in-memory SQLite
```

---

## Related Skills

For framework-specific patterns and advanced topics, see:

- **[Backend Patterns](../Backend/SKILL.md)** - Database design, RLS, API architecture, Supabase patterns
- **[Frontend Patterns](../Frontend/SKILL.md)** - React, state management, accessibility, performance

---

## Summary: The Foundation

**These principles matter more than any framework or library:**

1. **Check everything** - null, undefined, types, bounds
2. **Fail early** - Validate at the boundary
3. **One function, one job** - Single Responsibility
4. **Immutability** - Copy, don't mutate
5. **Explicit > Implicit** - Code should be obvious
6. **Guard clauses** - Exit early, reduce nesting
7. **Name things well** - Code is communication
8. **Handle all errors** - No silent failures
9. **Single source of truth** - Don't duplicate data
10. **Defensive programming** - Validate everything

**Master these, and you'll write better code in any language, any framework, any domain.**

