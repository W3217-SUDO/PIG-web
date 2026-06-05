# WeChat Pay Production Setup

Date: 2026-06-05

## Status

- Merchant ID material is available locally in `C:\Users\13533\Desktop\lvsuo\微信支付商户号接入资料_1655786861`.
- Backend JSAPI prepay is implemented at `POST /api/pay/orders/:orderId/wx-prepay`.
- WeChat Pay v3 notify verification, AES-GCM resource decrypt, and idempotent order settlement are implemented at `POST /api/pay/wx-notify`.
- Mini Program production order flow now calls `uni.requestPayment` after backend prepay.

## Required Production Secrets

Store these in server-side secrets only. Do not commit values or private keys.

```env
WX_PAY_APPID=wx7aaf3180b690e871
WX_PAY_MCH_ID=1655786861
WX_PAY_API_V3_KEY=<32-char API v3 key>
WX_PAY_CERT_SERIAL_NO=<merchant API cert serial>
WX_PAY_PRIVATE_KEY_PATH=/opt/pig/shared/certs/wechatpay/apiclient_key.pem
WX_PAY_PLATFORM_CERT_PATH=/opt/pig/shared/certs/wechatpay/wechatpay_799E63E55D5772C3017FF1D2B9883F3E6EF746C6.pem
WX_PAY_NOTIFY_URL=https://www.rockingwei.online/api/pay/wx-notify
```

The deploy renderer also accepts legacy material variable names from the handoff package:

```env
PAY_MCHID=
PAY_KEY_V3=
PAY_SERIAL=
PAY_KEY_PATH=
PAY_PLATFORM_CERT_PATH=
```

## Server File Permissions

Expected server paths:

```text
/opt/pig/shared/certs/wechatpay/apiclient_cert.pem
/opt/pig/shared/certs/wechatpay/apiclient_key.pem
/opt/pig/shared/certs/wechatpay/wechatpay_799E63E55D5772C3017FF1D2B9883F3E6EF746C6.pem
```

Recommended permissions:

```bash
chmod 700 /opt/pig/shared/certs/wechatpay
chmod 600 /opt/pig/shared/certs/wechatpay/*.pem
```

## Manual Verification

These checks do not expose secret values:

```bash
ssh pig 'test -s /opt/pig/shared/certs/wechatpay/apiclient_key.pem'
ssh pig 'test -s /opt/pig/shared/certs/wechatpay/wechatpay_799E63E55D5772C3017FF1D2B9883F3E6EF746C6.pem'
ssh pig 'openssl x509 -in /opt/pig/shared/certs/wechatpay/apiclient_cert.pem -noout -serial -dates'
ssh pig 'openssl x509 -in /opt/pig/shared/certs/wechatpay/wechatpay_799E63E55D5772C3017FF1D2B9883F3E6EF746C6.pem -noout -serial -dates'
```

After deployment:

```bash
ssh pig 'curl -fsS http://127.0.0.1:3000/api/health'
ssh pig 'cd /tmp/pig-smoke-scripts && bash smoke-prod.sh'
```

## Remaining External Checks

- Confirm the current Mini Program AppID is bound to merchant `1655786861` in WeChat Pay merchant platform.
- Configure notify URL in the merchant platform: `https://www.rockingwei.online/api/pay/wx-notify`.
- Use a real Mini Program tester to complete a 0.01 yuan payment.
- Confirm the order changes from `pending` to `paid` only after backend notify or backend order query reconciliation.
