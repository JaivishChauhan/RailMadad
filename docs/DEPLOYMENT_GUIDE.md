# Deployment Guide - User-Aware Chatbot System

## Overview

This guide provides comprehensive instructions for deploying the user-aware chatbot system to production environments. It covers prerequisites, configuration, deployment strategies, monitoring, and maintenance procedures.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Build Process](#build-process)
4. [Deployment Strategies](#deployment-strategies)
5. [Security Configuration](#security-configuration)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Recovery](#backup-and-recovery)
9. [Maintenance Procedures](#maintenance-procedures)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- Node.js 18.0 or higher
- npm 8.0 or higher
- 4GB RAM
- 20GB available disk space
- SSL certificate for HTTPS

**Recommended:**
- Node.js 20.0+
- npm 10.0+
- 8GB RAM
- 50GB available disk space
- CDN for static assets
- Load balancer for high availability

### External Services

1. **Authentication Provider** (Supabase)
   - Project configured with authentication
   - Database tables set up
   - Row Level Security policies configured

2. **AI Service** (Google Gemini)
   - API key with appropriate quotas
   - Content filtering configured

3. **Monitoring Services** (Optional)
   - Error tracking (Sentry, Bugsnag)
   - Performance monitoring (New Relic, DataDog)
   - Uptime monitoring (Pingdom, StatusPage)

### Development Tools

```bash
# Required global packages
npm install -g typescript
npm install -g vite
npm install -g @vitejs/plugin-react

# Optional but recommended
npm install -g pm2  # Process management
npm install -g serve # Static file serving
```

## Environment Configuration

### Environment Files

Create environment files for different stages:

**`.env.development`**
```env
# Development Environment
VITE_ENVIRONMENT=development
VITE_DEBUG=true

# Authentication
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# AI Configuration
VITE_GEMINI_API_KEY=your_development_api_key
VITE_AI_MODEL=gemini-pro

# Feature Flags
VITE_ENABLE_PLUGINS=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_TOOLS=true

# Performance
VITE_PERFORMANCE_MONITORING=true
VITE_ERROR_REPORTING=false
```

**`.env.staging`**
```env
# Staging Environment
VITE_ENVIRONMENT=staging
VITE_DEBUG=false

# Authentication
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging_anon_key

# AI Configuration
VITE_GEMINI_API_KEY=staging_api_key
VITE_AI_MODEL=gemini-pro

# Feature Flags
VITE_ENABLE_PLUGINS=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_TOOLS=false

# Performance
VITE_PERFORMANCE_MONITORING=true
VITE_ERROR_REPORTING=true
```

**`.env.production`**
```env
# Production Environment
VITE_ENVIRONMENT=production
VITE_DEBUG=false

# Authentication
VITE_SUPABASE_URL=https://production-project.supabase.co
VITE_SUPABASE_ANON_KEY=production_anon_key

# AI Configuration
VITE_GEMINI_API_KEY=production_api_key
VITE_AI_MODEL=gemini-pro

# Feature Flags
VITE_ENABLE_PLUGINS=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_TOOLS=false

# Performance
VITE_PERFORMANCE_MONITORING=true
VITE_ERROR_REPORTING=true

# CDN and Caching
VITE_CDN_URL=https://cdn.railmadad.com
VITE_ASSET_CACHE_DURATION=31536000
```

### Security Environment Variables

Store sensitive variables securely:

```bash
# Use environment variable injection or secret management
export VITE_SUPABASE_URL="$(vault kv get -field=url secret/railmadad/supabase)"
export VITE_GEMINI_API_KEY="$(vault kv get -field=api_key secret/railmadad/gemini)"
```

## Build Process

### Pre-Build Validation

```bash
#!/bin/bash
# pre-build.sh

echo "🔍 Running pre-build validation..."

# Type checking
echo "📝 Type checking..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ Type checking failed"
    exit 1
fi

# Linting
echo "🔍 Linting..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed"
    exit 1
fi

# Unit tests
echo "🧪 Running tests..."
npm run test:unit
if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

# Security audit
echo "🔒 Security audit..."
npm audit --audit-level moderate
if [ $? -ne 0 ]; then
    echo "⚠️ Security vulnerabilities found"
    # Continue but warn
fi

echo "✅ Pre-build validation complete"
```

### Build Script

```bash
#!/bin/bash
# build.sh

set -e

ENVIRONMENT=${1:-production}

echo "🚀 Building for environment: $ENVIRONMENT"

# Load environment
cp .env.$ENVIRONMENT .env

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Run pre-build validation
./scripts/pre-build.sh

# Build application
echo "🔨 Building application..."
npm run build

# Post-build optimization
echo "⚡ Optimizing build..."
npm run build:optimize

# Generate build report
echo "📊 Generating build report..."
npm run build:analyze

echo "✅ Build complete for $ENVIRONMENT"
```

### Build Optimization

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    // Optimization settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
          utils: ['./src/utils/index.ts']
        }
      }
    },
    // Asset optimization
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500
  },
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
})
```

## Deployment Strategies

### Strategy 1: Static Hosting (Recommended)

**Platforms:** Vercel, Netlify, Cloudflare Pages, AWS S3 + CloudFront

```bash
# Vercel deployment
npm install -g vercel
vercel --prod

# Netlify deployment
npm install -g netlify-cli
netlify deploy --prod --dir=dist

# Manual S3 deployment
aws s3 sync dist/ s3://railmadad-chatbot-prod/
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

**Vercel Configuration (`vercel.json`)**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Strategy 2: Container Deployment

**Dockerfile**
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Configuration (`nginx.conf`)**
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_types
        text/plain
        text/css
        text/js
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml+rss;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:";

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Cache static assets
        location /assets {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Handle SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

**Docker Compose (`docker-compose.yml`)**
```yaml
version: '3.8'

services:
  chatbot:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    
  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Strategy 3: Kubernetes Deployment

**Kubernetes Manifests (`k8s/`)**

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatbot
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chatbot
  template:
    metadata:
      labels:
        app: chatbot
    spec:
      containers:
      - name: chatbot
        image: railmadad/chatbot:latest
        ports:
        - containerPort: 80
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: chatbot-service
spec:
  selector:
    app: chatbot
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chatbot-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - chatbot.railmadad.com
    secretName: chatbot-tls
  rules:
  - host: chatbot.railmadad.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: chatbot-service
            port:
              number: 80
```

## Security Configuration

### Content Security Policy

```html
<!-- Strict CSP for production -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://apis.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

### SSL/TLS Configuration

```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;

# HSTS
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
```

### Environment Secrets Management

```bash
# Using Kubernetes secrets
kubectl create secret generic chatbot-secrets \
  --from-literal=supabase-url="${SUPABASE_URL}" \
  --from-literal=supabase-key="${SUPABASE_KEY}" \
  --from-literal=gemini-key="${GEMINI_API_KEY}"
```

## Performance Optimization

### CDN Configuration

```javascript
// Configure CDN for static assets
const CDN_CONFIG = {
  domains: ['cdn.railmadad.com'],
  caching: {
    static: '1y',
    html: '1h',
    api: '5m'
  },
  compression: {
    gzip: true,
    brotli: true
  }
};
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build:analyze

# Generate bundle report
npx webpack-bundle-analyzer dist/assets --mode server
```

### Performance Monitoring

```javascript
// performance.js
export const performanceMonitoring = {
  init() {
    // Core Web Vitals
    if ('web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      });
    }

    // Performance Observer
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          // Send to monitoring service
          this.sendMetric(entry);
        });
      });
      
      observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
    }
  },

  sendMetric(entry) {
    // Send to your monitoring service
    fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  }
};
```

## Monitoring and Logging

### Health Check Endpoints

```javascript
// health.js
export const healthCheck = {
  async check() {
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        userAwareness: await this.checkUserAwareness(),
        security: await this.checkSecurity(),
        plugins: await this.checkPlugins(),
        memory: this.checkMemory(),
        performance: this.checkPerformance()
      }
    };

    const isHealthy = Object.values(checks.checks).every(check => check.status === 'ok');
    checks.status = isHealthy ? 'healthy' : 'unhealthy';
    
    return checks;
  },

  async checkUserAwareness() {
    try {
      const manager = UserAwarenessManager.getInstance();
      return { status: 'ok', message: 'User awareness system operational' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
};
```

### Error Tracking

```javascript
// error-tracking.js
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Logging Configuration

```javascript
// logging.js
export class Logger {
  constructor(context) {
    this.context = context;
    this.level = import.meta.env.VITE_LOG_LEVEL || 'info';
  }

  log(level, message, data = {}) {
    if (this.shouldLog(level)) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message,
        data,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Console output for development
      if (import.meta.env.DEV) {
        console[level](message, data);
      }

      // Send to logging service in production
      if (import.meta.env.PROD) {
        this.sendToLoggingService(logEntry);
      }
    }
  }

  error(message, error, data = {}) {
    this.log('error', message, { ...data, error: error.stack });
  }

  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  info(message, data = {}) {
    this.log('info', message, data);
  }

  debug(message, data = {}) {
    this.log('debug', message, data);
  }
}
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

# Backup Supabase database
pg_dump $DATABASE_URL > $BACKUP_DIR/database.sql

# Backup user preferences from localStorage
# This would be handled by the application
node scripts/backup-user-data.js > $BACKUP_DIR/user-data.json

# Compress and upload to cloud storage
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
aws s3 cp $BACKUP_DIR.tar.gz s3://railmadad-backups/

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Strategy**: 
   - Daily automated backups
   - Weekly full backups
   - Real-time replication for critical data

### Recovery Procedures

```bash
#!/bin/bash
# disaster-recovery.sh

BACKUP_DATE=${1:-$(date +%Y-%m-%d)}
BACKUP_FILE="backups-$BACKUP_DATE.tar.gz"

echo "🔄 Starting disaster recovery..."

# Download backup
aws s3 cp s3://railmadad-backups/$BACKUP_FILE ./

# Extract backup
tar -xzf $BACKUP_FILE

# Restore database
psql $DATABASE_URL < $BACKUP_DATE/database.sql

# Restore application
# Deploy from backup or rebuild from git

echo "✅ Disaster recovery completed"
```

## Maintenance Procedures

### Regular Maintenance Tasks

```bash
#!/bin/bash
# maintenance.sh

echo "🔧 Starting maintenance tasks..."

# Update dependencies
npm update

# Security audit
npm audit fix

# Clean up old logs
find /var/log -name "*.log" -mtime +30 -delete

# Optimize database
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Clear old caches
redis-cli FLUSHDB

# Generate maintenance report
node scripts/maintenance-report.js

echo "✅ Maintenance completed"
```

### Scheduled Updates

```cron
# Crontab entries for automated maintenance

# Daily backup at 2 AM
0 2 * * * /scripts/backup-db.sh

# Weekly maintenance on Sunday at 3 AM
0 3 * * 0 /scripts/maintenance.sh

# Monthly security audit
0 4 1 * * /scripts/security-audit.sh

# Health check every 5 minutes
*/5 * * * * /scripts/health-check.sh
```

### Rolling Updates

```bash
#!/bin/bash
# rolling-update.sh

NEW_VERSION=$1
CURRENT_VERSION=$(cat VERSION)

echo "🚀 Rolling update from $CURRENT_VERSION to $NEW_VERSION"

# Pre-deployment validation
npm run test:production
npm run build

# Deploy to staging
kubectl set image deployment/chatbot-staging chatbot=railmadad/chatbot:$NEW_VERSION

# Wait for staging deployment
kubectl rollout status deployment/chatbot-staging

# Run integration tests on staging
npm run test:integration:staging

# Deploy to production with rolling update
kubectl set image deployment/chatbot chatbot=railmadad/chatbot:$NEW_VERSION

# Monitor deployment
kubectl rollout status deployment/chatbot

# Verify deployment
sleep 30
curl -f https://chatbot.railmadad.com/health

echo "✅ Rolling update completed"
```

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
npm run typecheck:clean

# Check for version conflicts
npm ls
```

#### Performance Issues

```bash
# Analyze bundle size
npm run build:analyze

# Check memory usage
node --inspect --max-old-space-size=4096 node_modules/.bin/vite build

# Profile runtime performance
npm run dev -- --profile
```

#### Security Issues

```bash
# Run security audit
npm audit
npm audit fix

# Check for vulnerable dependencies
npx snyk test

# Validate CSP
npx csp-evaluator --url https://chatbot.railmadad.com
```

### Debugging Tools

```javascript
// debug.js
export const debugTools = {
  // System health check
  async systemHealth() {
    const health = await systemValidator.runSystemHealthCheck();
    console.table(health);
    return health;
  },

  // Performance metrics
  performanceMetrics() {
    const metrics = performance.getEntriesByType('navigation')[0];
    console.table({
      'DNS Lookup': `${metrics.domainLookupEnd - metrics.domainLookupStart}ms`,
      'TCP Connection': `${metrics.connectEnd - metrics.connectStart}ms`,
      'Request/Response': `${metrics.responseEnd - metrics.requestStart}ms`,
      'DOM Loading': `${metrics.domContentLoadedEventEnd - metrics.domLoading}ms`,
      'Total Load Time': `${metrics.loadEventEnd - metrics.navigationStart}ms`
    });
  },

  // User context debug
  userContext() {
    const manager = UserAwarenessManager.getInstance();
    const context = manager.getCurrentContext();
    console.log('Current user context:', context);
    console.log('Subscriber count:', manager.getSubscriberCount());
  }
};

// Make available in development
if (import.meta.env.DEV) {
  window.debug = debugTools;
}
```

### Support Escalation

1. **Level 1**: Application logs and basic troubleshooting
2. **Level 2**: Performance analysis and system health checks
3. **Level 3**: Deep debugging and code-level investigation
4. **Level 4**: Infrastructure and external service issues

---

This deployment guide provides comprehensive coverage for deploying and maintaining the user-aware chatbot system in production environments. Follow the procedures step-by-step and adapt them to your specific infrastructure requirements.