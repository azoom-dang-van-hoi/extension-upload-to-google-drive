# DriveUploader-Extension

1. Setup extension:
- Bật chế độ Dev mode extension: chrome://extensions/ -> Developer mode
- Thêm extension: Load unpacked -> Chọn folder extension

2. Setup google api drive:
- Enable google drive api: Trong [library](https://console.cloud.google.com/apis/library?project=azoom-n-d-phong) search `google drive api`và enable API này.
- Create credential extension: 
+ Trong page [credential](https://console.cloud.google.com/apis/credentials?project=azoom-n-d-phong) chọn `Create credentials` -> `Oauth client ID` -> `Application Type: Chorme Extension` -> Trong `Item id` nhập id của chorme extension setup ở 1.
- Thêm test user: Trong page [credential consent](https://console.cloud.google.com/apis/credentials/consent?project=azoom-n-d-phong) thêm test user để test ở local.
- Trong file `manifest.json`, thay đổi config `client_id` theo Credential vừa tạo