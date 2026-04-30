import { serializeFormData, generateBoundary } from './form-data-serializer';

describe('FormData Serializer', () => {
  describe('generateBoundary()', () => {
    it('generates unique boundaries', () => {
      const b1 = generateBoundary();
      const b2 = generateBoundary();
      expect(b1).not.toBe(b2);
      expect(b1).toMatch(/^----WebBridgeFormBoundary/);
    });
  });

  describe('serializeFormData()', () => {
    it('serializes text fields', () => {
      const result = serializeFormData([
        { name: 'username', value: 'john' },
        { name: 'email', value: 'john@example.com' },
      ]);

      expect(result.body).toContain('Content-Disposition: form-data; name="username"');
      expect(result.body).toContain('john');
      expect(result.body).toContain('Content-Disposition: form-data; name="email"');
      expect(result.body).toContain('john@example.com');
    });

    it('serializes file-like entries', () => {
      const result = serializeFormData([
        {
          name: 'avatar',
          value: {
            data: 'base64encodeddata',
            filename: 'photo.png',
            contentType: 'image/png',
          },
        },
      ]);

      expect(result.body).toContain('filename="photo.png"');
      expect(result.body).toContain('Content-Type: image/png');
      expect(result.body).toContain('base64encodeddata');
    });

    it('Content-Type includes boundary', () => {
      const result = serializeFormData([{ name: 'field', value: 'value' }]);
      expect(result.contentType).toMatch(/^multipart\/form-data; boundary=----WebBridgeFormBoundary/);
    });

    it('serialized body contains closing boundary', () => {
      const result = serializeFormData([{ name: 'field', value: 'value' }]);
      // Extract boundary from content type
      const boundary = result.contentType.split('boundary=')[1];
      expect(result.body).toContain(`--${boundary}--`);
    });

    it('roundtrip: body contains all fields', () => {
      const entries = [
        { name: 'name', value: 'Alice' },
        { name: 'age', value: '30' },
        {
          name: 'file',
          value: { data: 'filedata', filename: 'doc.txt', contentType: 'text/plain' },
        },
      ];
      const result = serializeFormData(entries);

      expect(result.body).toContain('Alice');
      expect(result.body).toContain('30');
      expect(result.body).toContain('filedata');
      expect(result.body).toContain('doc.txt');
    });

    it('throws for empty entries', () => {
      expect(() => serializeFormData([])).toThrow('FormData entries must not be empty');
    });
  });
});
