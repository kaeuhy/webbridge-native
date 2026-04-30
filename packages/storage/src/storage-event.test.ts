import { WBStorageEvent } from './storage-event';
import { WBStorage } from './web-storage';

describe('WBStorageEvent', () => {
  let storage: WBStorage;

  beforeEach(() => {
    storage = new WBStorage();
  });

  it('event has correct key/oldValue/newValue', () => {
    const event = new WBStorageEvent({
      key: 'myKey',
      oldValue: 'oldVal',
      newValue: 'newVal',
      storageArea: storage,
    });
    expect(event.key).toBe('myKey');
    expect(event.oldValue).toBe('oldVal');
    expect(event.newValue).toBe('newVal');
  });

  it('event references storageArea', () => {
    const event = new WBStorageEvent({
      key: 'k',
      oldValue: null,
      newValue: 'v',
      storageArea: storage,
    });
    expect(event.storageArea).toBe(storage);
  });

  it('clear event has null key', () => {
    const event = new WBStorageEvent({
      key: null,
      oldValue: null,
      newValue: null,
      storageArea: storage,
    });
    expect(event.key).toBeNull();
    expect(event.oldValue).toBeNull();
    expect(event.newValue).toBeNull();
  });

  it('url defaults to empty string when not provided', () => {
    const event = new WBStorageEvent({
      key: 'k',
      oldValue: null,
      newValue: 'v',
      storageArea: storage,
    });
    expect(event.url).toBe('');
  });

  it('url is set when provided', () => {
    const event = new WBStorageEvent({
      key: 'k',
      oldValue: null,
      newValue: 'v',
      url: 'https://example.com',
      storageArea: storage,
    });
    expect(event.url).toBe('https://example.com');
  });
});
