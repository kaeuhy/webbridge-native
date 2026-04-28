require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = "react-native-webbridge-native-bridge"
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']
  s.authors      = "WebBridge Native Contributors"
  s.homepage     = "https://github.com/user/webbridge-native"
  s.source       = { :git => "https://github.com/user/webbridge-native.git", :tag => "v#{s.version}" }

  s.ios.deployment_target = "13.4"
  s.swift_version = "5.0"

  s.source_files = "ios/**/*.{swift,h,m,mm}"

  install_modules_dependencies(s)
end
