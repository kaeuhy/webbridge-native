import { randomUUID } from './random-uuid';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomUUID', () => {
  it('returns string in UUID format (regex validation)', () => {
    const uuid = randomUUID();
    expect(uuid).toMatch(UUID_REGEX);
  });

  it('version 4 (position 14 is "4")', () => {
    const uuid = randomUUID();
    expect(uuid[14]).toBe('4');
  });

  it('variant (position 19 is 8/9/a/b)', () => {
    const uuid = randomUUID();
    expect(['8', '9', 'a', 'b']).toContain(uuid[19]);
  });

  it('each call generates unique UUID', () => {
    const a = randomUUID();
    const b = randomUUID();
    expect(a).not.toBe(b);
  });

  it('length is 36 chars', () => {
    const uuid = randomUUID();
    expect(uuid.length).toBe(36);
  });

  it('contains only valid hex chars and dashes', () => {
    const uuid = randomUUID();
    expect(uuid).toMatch(/^[0-9a-f-]+$/);
  });

  it('100 UUIDs are all unique', () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      uuids.add(randomUUID());
    }
    expect(uuids.size).toBe(100);
  });

  it('dashes are at correct positions (8, 13, 18, 23)', () => {
    const uuid = randomUUID();
    expect(uuid[8]).toBe('-');
    expect(uuid[13]).toBe('-');
    expect(uuid[18]).toBe('-');
    expect(uuid[23]).toBe('-');
  });

  it('all 100 UUIDs pass full format validation', () => {
    for (let i = 0; i < 100; i++) {
      expect(randomUUID()).toMatch(UUID_REGEX);
    }
  });
});
