const babel = require('@babel/core');
const plugin = require('./index');

function transform(code) {
  return babel.transformSync(code, {
    plugins: [plugin],
    configFile: false,
  }).code;
}

describe('babel-plugin-strip-dev', () => {
  it('removes @webbridge-native/devtools import', () => {
    const input = `import { devtoolsInterceptor } from '@webbridge-native/devtools';`;
    const output = transform(input);
    expect(output).not.toContain('@webbridge-native/devtools');
    expect(output.trim()).toBe('');
  });

  it('removes @webbridge-native/cors import', () => {
    const input = `import { corsInterceptor } from '@webbridge-native/cors';`;
    const output = transform(input);
    expect(output).not.toContain('@webbridge-native/cors');
  });

  it('keeps other @webbridge-native imports', () => {
    const input = `import { setupWebBridge } from '@webbridge-native/preset';`;
    const output = transform(input);
    expect(output).toContain('@webbridge-native/preset');
  });

  it('keeps non-webbridge imports', () => {
    const input = `import React from 'react';`;
    const output = transform(input);
    expect(output).toContain('react');
  });

  it('handles multiple imports correctly', () => {
    const input = `
import { setupWebBridge } from '@webbridge-native/preset';
import { devtoolsInterceptor } from '@webbridge-native/devtools';
import { corsInterceptor } from '@webbridge-native/cors';
const x = 1;
`;
    const output = transform(input);
    expect(output).toContain('@webbridge-native/preset');
    expect(output).not.toContain('@webbridge-native/devtools');
    expect(output).not.toContain('@webbridge-native/cors');
    expect(output).toContain('const x = 1');
  });
});
