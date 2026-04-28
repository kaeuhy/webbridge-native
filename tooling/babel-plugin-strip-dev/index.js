/**
 * Babel plugin — production 빌드에서 dev-only 패키지 import를 제거.
 *
 * 제거 대상:
 * - @webbridge-native/devtools
 * - @webbridge-native/cors
 *
 * 사용법 (babel.config.js):
 * ```
 * module.exports = {
 *   plugins: [
 *     process.env.NODE_ENV === 'production' && '@webbridge-native/babel-plugin-strip-dev',
 *   ].filter(Boolean),
 * };
 * ```
 */

const DEV_PACKAGES = new Set([
  '@webbridge-native/devtools',
  '@webbridge-native/cors',
]);

module.exports = function webBridgeStripDevPlugin() {
  return {
    name: 'webbridge-strip-dev',
    visitor: {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (DEV_PACKAGES.has(source)) {
          path.remove();
        }
      },
      CallExpression(path) {
        // require('@webbridge-native/devtools') 제거
        if (
          path.node.callee.name === 'require' &&
          path.node.arguments.length === 1 &&
          path.node.arguments[0].type === 'StringLiteral' &&
          DEV_PACKAGES.has(path.node.arguments[0].value)
        ) {
          // require 문이 변수 선언의 일부면 전체 선언 제거
          const parent = path.parentPath;
          if (parent.isVariableDeclarator()) {
            parent.parentPath.remove();
          } else {
            path.remove();
          }
        }
      },
    },
  };
};
