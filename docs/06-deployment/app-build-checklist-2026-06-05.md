# APP Build Checklist

Date: 2026-06-05

This project uses the same `frontend/` uni-app codebase for H5, WeChat Mini Program, and APP.

## Current Status

- Local APP build command is available: `npm -w frontend run build:app`.
- Build output directory: `frontend/dist/build/app`.
- Verified on 2026-06-05: local APP build completed successfully.
- This output is not an APK or IPA by itself. Use HBuilderX or DCloud cloud packaging to produce installable packages.

## Local Build

From the repository root:

```bash
npm run audit:workspace-scripts
npm -w frontend run build:app
```

Expected output:

```text
DONE  Build complete.
运行方式：打开 HBuilderX, 导入 dist\build\app 运行。
```

## Android APK Next Steps

1. Open HBuilderX.
2. Import `C:\Users\13533\Desktop\PIG\frontend\dist\build\app`.
3. Configure Android package name, icon, splash screen, permissions, and signing certificate.
4. Use local packaging or DCloud cloud packaging to generate APK.
5. Install on at least 3 Android test devices and verify:
   - Login page opens.
   - Home pig list loads from `https://www.rockingwei.online/api`.
   - Pig detail and timeline open.
   - Order registration flow creates a pending order.
   - Profile avatar upload works.
   - No `localhost`, `dev-login`, or mock payment text appears in production screens.

## iOS Next Steps

iOS packaging still depends on Apple Developer Program access, signing certificates, bundle ID, and TestFlight setup.

## Not Done Yet

- Android APK package generation.
- Android signing certificate setup.
- Internal APK distribution.
- iOS IPA package generation.
- TestFlight internal testing.
