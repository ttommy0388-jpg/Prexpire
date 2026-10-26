// Android reads text with ML Kit through Google Play services, which downloads the
// text-recognition model on first use. This asks Play to download it at install time
// instead, so the first scan does not wait on (or fail for lack of) a network connection.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = function withMlKitOcrModel(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, 'com.google.mlkit.vision.DEPENDENCIES', 'ocr');
    return cfg;
  });
};
