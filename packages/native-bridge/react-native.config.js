module.exports = {
  dependency: {
    platforms: {
      android: {
        packageImportPath:
          'import com.webbridgenative.nativebridge.WebBridgeNativePackage;',
        packageInstance: 'new WebBridgeNativePackage()',
      },
      ios: {},
    },
  },
};
