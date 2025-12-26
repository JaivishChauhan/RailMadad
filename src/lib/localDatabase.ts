/**
 * Local Database Service 
 * Provides a simple in-memory + localStorage persistence layer
 */

// Storage keys
const STORAGE_KEYS = {
  USERS: 'railmadad_users',
  COMPLAINTS: 'railmadad_complaints',
  ATTACHMENTS: 'railmadad_attachments',
  CURRENT_USER: 'railmadad_current_user',
  ADMIN_USER: 'railmadad_admin_user',
};

// Cookie helpers for session management
const COOKIE_NAME = 'railmadad_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const setCookie = (name: string, value: string, maxAge: number = COOKIE_MAX_AGE): void => {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
};

const getCookie = (name: string): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
};

const deleteCookie = (name: string): void => {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`;
};

// Session storage using cookies
const getSessionFromCookie = <T>(): T | null => {
  try {
    const data = getCookie(COOKIE_NAME);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const saveSessionToCookie = <T>(data: T | null): void => {
  if (data) {
    setCookie(COOKIE_NAME, JSON.stringify(data));
  } else {
    deleteCookie(COOKIE_NAME);
  }
};

// Types matching the old Supabase types
export interface Profile {
  id: string;
  role: 'passenger' | 'official' | 'super_admin';
  full_name?: string;
  email?: string;
  phone?: string;
  employee_id?: string;
  department?: string;
  station_code?: string;
  zone?: string;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  user_id: string;
  complaint_area: 'TRAIN' | 'STATION';
  train_number?: string;
  train_name?: string;
  pnr?: string;
  coach_number?: string;
  seat_number?: string;
  journey_date?: string;
  station_code?: string;
  station_name?: string;
  incident_date: string;
  incident_time?: string;
  location?: string;
  complaint_type: string;
  complaint_subtype: string;
  description: string;
  source: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed' | 'escalated' | 'withdrawn';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
  assigned_at?: string;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplaintAttachment {
  id: string;
  complaint_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  uploaded_by: string;
  created_at: string;
}

// Helper to generate UUID
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Generic storage helpers
const getFromStorage = <T>(key: string): T[] => {
  try {
    const data = window.localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveToStorage = <T>(key: string, data: T[]): void => {
  window.localStorage.setItem(key, JSON.stringify(data));
};

const getObjectFromStorage = <T>(key: string): T | null => {
  try {
    const data = window.localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const saveObjectToStorage = <T>(key: string, data: T | null): void => {
  if (data) {
    window.localStorage.setItem(key, JSON.stringify(data));
  } else {
    window.localStorage.removeItem(key);
  }
};

// Demo/Dummy accounts - auto-created on first use
const DEMO_ACCOUNTS = {
  passenger: {
    email: 'passenger@demo.com',
    password: 'demo123',
    full_name: 'Demo Passenger',
    phone: '9876543210',
    role: 'passenger' as const
  }
};

// Auth Service
export const localAuth = {
  currentUser: null as Profile | null,

  async getSession(): Promise<{ user: Profile | null }> {
    // Get session from cookie (secure)
    const user = getSessionFromCookie<Profile>();
    this.currentUser = user;
    return { user };
  },

  async signUp(email: string, password: string, metadata?: { full_name?: string; phone?: string }): Promise<{ user: Profile | null; error: Error | null }> {
    const users = getFromStorage<Profile & { password: string }>(STORAGE_KEYS.USERS);

    // Check if user exists
    if (users.find(u => u.email === email)) {
      return { user: null, error: new Error('User already exists') };
    }

    const newUser: Profile & { password: string } = {
      id: generateId(),
      email,
      password, // In real app, hash this!
      role: 'passenger',
      full_name: metadata?.full_name || email.split('@')[0],
      phone: metadata?.phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, users);

    const { password: _, ...userWithoutPassword } = newUser;
    this.currentUser = userWithoutPassword;
    // Store session in cookie (secure)
    saveSessionToCookie(userWithoutPassword);

    return { user: userWithoutPassword, error: null };
  },

  async signInWithPassword(email: string, password: string): Promise<{ user: Profile | null; error: Error | null }> {
    let users = getFromStorage<Profile & { password: string }>(STORAGE_KEYS.USERS);

    // Auto-create demo passenger account if logging in with demo credentials
    const demoAccount = DEMO_ACCOUNTS.passenger;
    if (email === demoAccount.email && password === demoAccount.password) {
      const existingDemo = users.find(u => u.email === demoAccount.email);
      if (!existingDemo) {
        const newDemoUser: Profile & { password: string } = {
          id: generateId(),
          email: demoAccount.email,
          password: demoAccount.password,
          role: demoAccount.role,
          full_name: demoAccount.full_name,
          phone: demoAccount.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        users.push(newDemoUser);
        saveToStorage(STORAGE_KEYS.USERS, users);
        console.log('🎭 Demo passenger account created');
      }
    }

    // Also allow any email/password combo for easy testing (auto-create user)
    let user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      // Auto-create user for easy demo access
      const newUser: Profile & { password: string } = {
        id: generateId(),
        email,
        password,
        role: 'passenger',
        full_name: email.split('@')[0],
        phone: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      users.push(newUser);
      saveToStorage(STORAGE_KEYS.USERS, users);
      user = newUser;
      console.log('🎭 New user auto-created:', email);
    }

    const { password: _, ...userWithoutPassword } = user;
    this.currentUser = userWithoutPassword;
    // Store session in cookie (secure)
    saveSessionToCookie(userWithoutPassword);

    return { user: userWithoutPassword, error: null };
  },

  async signOut(): Promise<void> {
    this.currentUser = null;
    // Clear session cookie
    saveSessionToCookie(null);
  },

  onAuthStateChange(callback: (event: string, session: { user: Profile | null } | null) => void): { data: { subscription: { unsubscribe: () => void } } } {
    // Get session from cookie
    const user = getSessionFromCookie<Profile>();
    if (user) {
      setTimeout(() => callback('SIGNED_IN', { user }), 0);
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => { }
        }
      }
    };
  }
};

// Database Service (mimics Supabase query builder)
class QueryBuilder<T extends { id: string }> {
  private tableName: string;
  private filters: Array<{ field: string; value: any; op: string }> = [];
  private orderField: string | null = null;
  private orderAsc: boolean = true;
  private selectFields: string = '*';
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private isCount: boolean = false;
  private isHead: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private getStorageKey(): string {
    switch (this.tableName) {
      case 'complaints': return STORAGE_KEYS.COMPLAINTS;
      case 'complaint_attachments': return STORAGE_KEYS.ATTACHMENTS;
      case 'profiles': return STORAGE_KEYS.USERS;
      default: return `railmadad_${this.tableName}`;
    }
  }

  select(fields: string = '*', options?: { count?: string; head?: boolean }): this {
    this.selectFields = fields;
    if (options?.count) this.isCount = true;
    if (options?.head) this.isHead = true;
    return this;
  }

  eq(field: string, value: any): this {
    this.filters.push({ field, value, op: 'eq' });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }): this {
    this.orderField = field;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.isSingle = true;
    return this;
  }

  async then<TResult>(
    onfulfilled?: ((value: { data: T | T[] | null; error: Error | null; count?: number }) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as any;
  }

  private async execute(): Promise<{ data: T | T[] | null; error: Error | null; count?: number }> {
    try {
      let data = getFromStorage<T>(this.getStorageKey());

      // Apply filters
      for (const filter of this.filters) {
        if (filter.op === 'eq') {
          data = data.filter(item => (item as any)[filter.field] === filter.value);
        }
      }

      // Apply ordering
      if (this.orderField) {
        data.sort((a, b) => {
          const aVal = (a as any)[this.orderField!];
          const bVal = (b as any)[this.orderField!];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return this.orderAsc ? comparison : -comparison;
        });
      }

      // Apply limit
      if (this.limitCount) {
        data = data.slice(0, this.limitCount);
      }

      if (this.isHead) {
        return { data: null, error: null, count: data.length };
      }

      if (this.isSingle) {
        return { data: data[0] || null, error: data.length === 0 ? new Error('No rows found') : null };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

class InsertBuilder<T extends { id: string }> {
  private tableName: string;
  private insertData: Partial<T> | Partial<T>[];
  private shouldSelect: boolean = false;
  private isSingle: boolean = false;

  constructor(tableName: string, data: Partial<T> | Partial<T>[]) {
    this.tableName = tableName;
    this.insertData = data;
  }

  private getStorageKey(): string {
    switch (this.tableName) {
      case 'complaints': return STORAGE_KEYS.COMPLAINTS;
      case 'complaint_attachments': return STORAGE_KEYS.ATTACHMENTS;
      case 'profiles': return STORAGE_KEYS.USERS;
      default: return `railmadad_${this.tableName}`;
    }
  }

  select(): this {
    this.shouldSelect = true;
    return this;
  }

  single(): this {
    this.isSingle = true;
    return this;
  }

  async then<TResult>(
    onfulfilled?: ((value: { data: T | T[] | null; error: Error | null }) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as any;
  }

  private async execute(): Promise<{ data: T | T[] | null; error: Error | null }> {
    try {
      const existing = getFromStorage<T>(this.getStorageKey());
      const items = Array.isArray(this.insertData) ? this.insertData : [this.insertData];

      const newItems: T[] = items.map(item => ({
        ...item,
        id: (item as any).id || generateId(),
        created_at: (item as any).created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as T));

      saveToStorage(this.getStorageKey(), [...existing, ...newItems]);

      if (this.shouldSelect) {
        return { data: this.isSingle ? newItems[0] : newItems, error: null };
      }
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

class UpdateBuilder<T extends { id: string }> {
  private tableName: string;
  private updateData: Partial<T>;
  private filters: Array<{ field: string; value: any }> = [];

  constructor(tableName: string, data: Partial<T>) {
    this.tableName = tableName;
    this.updateData = data;
  }

  private getStorageKey(): string {
    switch (this.tableName) {
      case 'complaints': return STORAGE_KEYS.COMPLAINTS;
      case 'complaint_attachments': return STORAGE_KEYS.ATTACHMENTS;
      case 'profiles': return STORAGE_KEYS.USERS;
      default: return `railmadad_${this.tableName}`;
    }
  }

  eq(field: string, value: any): this {
    this.filters.push({ field, value });
    return this;
  }

  async then<TResult>(
    onfulfilled?: ((value: { data: null; error: Error | null }) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as any;
  }

  private async execute(): Promise<{ data: null; error: Error | null }> {
    try {
      const data = getFromStorage<T>(this.getStorageKey());

      const updated = data.map(item => {
        const matches = this.filters.every(f => (item as any)[f.field] === f.value);
        if (matches) {
          return { ...item, ...this.updateData, updated_at: new Date().toISOString() };
        }
        return item;
      });

      saveToStorage(this.getStorageKey(), updated);
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

class DeleteBuilder<T extends { id: string }> {
  private tableName: string;
  private filters: Array<{ field: string; value: any }> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private getStorageKey(): string {
    switch (this.tableName) {
      case 'complaints': return STORAGE_KEYS.COMPLAINTS;
      case 'complaint_attachments': return STORAGE_KEYS.ATTACHMENTS;
      case 'profiles': return STORAGE_KEYS.USERS;
      default: return `railmadad_${this.tableName}`;
    }
  }

  eq(field: string, value: any): this {
    this.filters.push({ field, value });
    return this;
  }

  async then<TResult>(
    onfulfilled?: ((value: { data: null; error: Error | null }) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as any;
  }

  private async execute(): Promise<{ data: null; error: Error | null }> {
    try {
      const data = getFromStorage<T>(this.getStorageKey());

      const filtered = data.filter(item => {
        return !this.filters.every(f => (item as any)[f.field] === f.value);
      });

      saveToStorage(this.getStorageKey(), filtered);
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

// Storage Service (for file uploads - stores as base64 in localStorage)
export const localStorage = {
  from(bucket: string) {
    return {
      async upload(path: string, file: File): Promise<{ data: { path: string } | null; error: Error | null }> {
        try {
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onload = () => {
              const base64 = reader.result as string;
              const key = `railmadad_files_${bucket}_${path}`;
              window.localStorage.setItem(key, base64);
              resolve({ data: { path }, error: null });
            };
            reader.onerror = () => resolve({ data: null, error: new Error('Failed to read file') });
            reader.readAsDataURL(file);
          });
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      getPublicUrl(path: string): { data: { publicUrl: string } } {
        const key = `railmadad_files_${bucket}_${path}`;
        const base64 = window.localStorage.getItem(key);
        return { data: { publicUrl: base64 || '' } };
      }
    };
  }
};

/**
 * Type mapping for database tables.
 * Associates table names with their corresponding TypeScript interfaces.
 * This enables proper type inference for insert, update, and query operations.
 */
type TableTypeMap = {
  profiles: Profile;
  complaints: Complaint;
  complaint_attachments: ComplaintAttachment;
};

/**
 * Union of all known table names for type-safe table access.
 */
type KnownTable = keyof TableTypeMap;

/**
 * Main database interface (mimics Supabase client).
 * Provides a type-safe local storage ORM with support for CRUD operations.
 * 
 * @example
 * // Type-safe insert with full schema inference
 * localDb.from('profiles').insert({ id: '123', role: 'passenger' });
 */
export const localDb = {
  /**
   * Selects a table for querying or mutation.
   * Uses conditional typing to provide proper schema inference for known tables.
   * 
   * @param table - The name of the table to operate on
   * @returns A query/mutation builder with proper type inference
   */
  from<TName extends string>(table: TName) {
    // Use conditional type to resolve table type; fall back to generic if unknown
    type ResolvedType = TName extends KnownTable ? TableTypeMap[TName] : { id: string };

    return {
      select(fields: string = '*', options?: { count?: string; head?: boolean }) {
        return new QueryBuilder<ResolvedType>(table).select(fields, options);
      },
      insert(data: Partial<ResolvedType> | Partial<ResolvedType>[]) {
        return new InsertBuilder<ResolvedType>(table, data);
      },
      update(data: Partial<ResolvedType>) {
        return new UpdateBuilder<ResolvedType>(table, data);
      },
      delete() {
        return new DeleteBuilder<ResolvedType>(table);
      }
    };
  },
  auth: localAuth,
  storage: localStorage
};

// Export compatible types
export type { Complaint as SupabaseComplaint };

// Default export for compatibility
export default localDb;
