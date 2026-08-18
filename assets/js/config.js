(function initLudisConfig(global) {
  const config = Object.freeze({
    SUPABASE_URL: "https://jnjfzmbzuucwpuepahtz.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_j1ykY1_no66Xmv86OV94xA_ezRqRKqM",
    WINDOWS_APP_DOWNLOAD_URL: "https://github.com/proof010221-creator/proof/releases/latest/download/LudisSetup.exe",
    CUSTOMER_CENTER_URL: "https://discord.gg/9bX3D9MwRc"
  });

  global.LUDIS_CONFIG = config;
  // 이전 코드가 참조하는 전역 이름은 호환성을 위해 유지한다.
  global.LUDIS_WINDOWS_APP_DOWNLOAD_URL = config.WINDOWS_APP_DOWNLOAD_URL;
  global.LUDIS_CUSTOMER_CENTER_URL = config.CUSTOMER_CENTER_URL;
})(window);
