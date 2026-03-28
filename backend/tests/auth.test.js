'use strict';
// ================================================================
// tests/auth.test.js
// Integration tests for auth routes
// Run: npm test
// Requires a test database configured via TEST_DB_* env vars.
// ================================================================
const request = require('supertest');
const bcrypt  = require('bcryptjs');
const app     = require('../src/server');
const { publicDb } = require('../config/database');

// ── Test data ─────────────────────────────────────────────────
const TEST_TENANT = {
  id:   '00000000-0000-0000-0000-000000000001',
  slug: 'test_tenant',
};

const TEST_USER = {
  id:           '00000000-0000-0000-0000-000000000002',
  email:        'test.cashier@erp.test',
  password:     'TestPass123!',
  full_name:    'Test Cashier',
  tenant_id:    TEST_TENANT.id,
};

// ── Helpers ───────────────────────────────────────────────────
async function seedTestUser() {
  const hash = await bcrypt.hash(TEST_USER.password, 4); // low rounds for speed
  await publicDb.execute(
    `INSERT INTO users (id, tenant_id, email, password_hash, full_name, is_active)
     VALUES ($1,$2,$3,$4,$5,TRUE)
     ON CONFLICT (id) DO UPDATE SET password_hash=$4, is_active=TRUE`,
    [TEST_USER.id, TEST_USER.tenant_id, TEST_USER.email, hash, TEST_USER.full_name]
  );
}

async function cleanupTestUser() {
  await publicDb.execute(`DELETE FROM refresh_tokens WHERE user_id=$1`, [TEST_USER.id]);
  await publicDb.execute(`DELETE FROM users WHERE id=$1`, [TEST_USER.id]);
}

// ── Test suite ────────────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => { await seedTestUser(); });
  afterAll(async ()  => { await cleanupTestUser(); });

  it('returns 400 when body is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'notanemail', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'SomePass1!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid email or password/i);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: 'WrongPass999!' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with tokens for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe(TEST_USER.email);
  });
});

describe('GET /api/v1/auth/me', () => {
  let accessToken;

  beforeAll(async () => {
    await seedTestUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    accessToken = res.body.data?.accessToken;
  });
  afterAll(cleanupTestUser);

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  it('returns user profile with valid token', async () => {
    if (!accessToken) return; // skip if login failed
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(TEST_USER.email);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  let refreshToken;

  beforeAll(async () => {
    await seedTestUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    refreshToken = res.body.data?.refreshToken;
  });
  afterAll(cleanupTestUser);

  it('returns 400 when refresh token missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for fake refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'faketoken123' });
    expect(res.status).toBe(401);
  });

  it('returns new access token with valid refresh token', async () => {
    if (!refreshToken) return;
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken'); // rotated
  });
});

describe('Rate limiting on /auth/login', () => {
  it('responds with 429 after exceeding limits', async () => {
    // Send 11 rapid requests (limit is 10 per 15 min in test)
    const reqs = Array.from({ length: 11 }, () =>
      request(app).post('/api/v1/auth/login')
        .send({ email: 'spam@test.com', password: 'x' })
    );
    const results = await Promise.all(reqs);
    const tooMany = results.filter(r => r.status === 429);
    // At least one should be rate-limited
    expect(tooMany.length).toBeGreaterThan(0);
  });
});

describe('GET /health', () => {
  it('returns 200 or 503 based on DB status', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('services');
  });
});
