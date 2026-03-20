import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEnvKeyInfo } from '../env';

describe('getEnvKeyInfo', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns set=true with length for existing env var', () => {
    process.env.TEST_KEY = 'abc123';
    const info = getEnvKeyInfo('TEST_KEY');
    expect(info.set).toBe(true);
    expect(info.length).toBe(6);
  });

  it('returns set=false for missing env var', () => {
    delete process.env.NONEXISTENT_KEY;
    const info = getEnvKeyInfo('NONEXISTENT_KEY');
    expect(info.set).toBe(false);
    expect(info.length).toBe(0);
  });

  it('returns set=false for empty env var', () => {
    process.env.EMPTY_KEY = '';
    const info = getEnvKeyInfo('EMPTY_KEY');
    expect(info.set).toBe(false);
    expect(info.length).toBe(0);
  });

  it('trims whitespace from env var values', () => {
    process.env.SPACED_KEY = '  mykey  ';
    const info = getEnvKeyInfo('SPACED_KEY');
    expect(info.set).toBe(true);
    expect(info.length).toBe(5);
  });
});
