package com.webbridgenative.nativebridge

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * WebBridgeNativePackage — React Native 자동 링킹용 패키지.
 *
 * TurboReactPackage를 상속하여 New Architecture(TurboModule)를 지원한다.
 * react-native.config.js에서 이 패키지를 auto-link에 등록한다.
 */
class WebBridgeNativePackage : TurboReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            WebBridgeNativeModule.NAME -> WebBridgeNativeModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                WebBridgeNativeModule.NAME to ReactModuleInfo(
                    WebBridgeNativeModule.NAME,
                    WebBridgeNativeModule.NAME,
                    canOverrideExistingModule = false,
                    needsEagerInit = false,
                    isCxxModule = false,
                    isTurboModule = true
                )
            )
        }
    }

}
