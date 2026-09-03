# Changelog

## [1.5.0](https://github.com/DucCuong159/Realtime-chatapp/compare/realtime-chatapp-v1.4.0...realtime-chatapp-v1.5.0) (2026-09-03)


### Features

* **call:** add WebRTC 1-on-1 video call support and active controls ([#87](https://github.com/DucCuong159/Realtime-chatapp/issues/87)) ([95a3b95](https://github.com/DucCuong159/Realtime-chatapp/commit/95a3b95a886c61f5587c788c172a70661b9b7ac0))

## [1.4.0](https://github.com/DucCuong159/Realtime-chatapp/compare/realtime-chatapp-v1.3.0...realtime-chatapp-v1.4.0) (2026-09-02)


### Features

* **call:** integrate real-time 1-on-1 webrtc voice call feature ([#32](https://github.com/DucCuong159/Realtime-chatapp/issues/32)) ([#82](https://github.com/DucCuong159/Realtime-chatapp/issues/82)) ([49d79bb](https://github.com/DucCuong159/Realtime-chatapp/commit/49d79bb02e87ee7e64c2c0afb9a7fc19d5b7c9a2))


### Bug Fixes

* **ai:** filter out non-conversational models and probe with multi-turn payload ([#85](https://github.com/DucCuong159/Realtime-chatapp/issues/85)) ([e813dee](https://github.com/DucCuong159/Realtime-chatapp/commit/e813dee6fa719240ff72d5a3d6a1966375e36212))

## [1.3.0](https://github.com/DucCuong159/Realtime-chatapp/compare/realtime-chatapp-v1.2.0...realtime-chatapp-v1.3.0) (2026-08-26)


### Features

* **conversation:** implement cursor-based pagination and infinite scroll ([#40](https://github.com/DucCuong159/Realtime-chatapp/issues/40)) ([#79](https://github.com/DucCuong159/Realtime-chatapp/issues/79)) ([a0d31d6](https://github.com/DucCuong159/Realtime-chatapp/commit/a0d31d69e95ffc961e4655fad250fea473290e50))
* **script:** add message benchmark tool and update documentation ([#81](https://github.com/DucCuong159/Realtime-chatapp/issues/81)) ([d9140c6](https://github.com/DucCuong159/Realtime-chatapp/commit/d9140c68af8cf19b3328acc2a72225c5500cbe08))

## [1.2.0](https://github.com/DucCuong159/Realtime-chatapp/compare/realtime-chatapp-v1.1.0...realtime-chatapp-v1.2.0) (2026-08-25)


### Features

* add AI model selector with quota status and dynamic dispatch ([#49](https://github.com/DucCuong159/Realtime-chatapp/issues/49)) ([#50](https://github.com/DucCuong159/Realtime-chatapp/issues/50)) ([312b28d](https://github.com/DucCuong159/Realtime-chatapp/commit/312b28d9919e84bc4e6d48ab44dd14f111247ea1))
* **agent:** add agentic skills framework and custom guidelines ([#78](https://github.com/DucCuong159/Realtime-chatapp/issues/78)) ([41b152e](https://github.com/DucCuong159/Realtime-chatapp/commit/41b152e629e3653cf5376c199e874b8dc92353f2))


### Bug Fixes

* display error toast notification for auth failures ([#25](https://github.com/DucCuong159/Realtime-chatapp/issues/25)) ([#52](https://github.com/DucCuong159/Realtime-chatapp/issues/52)) ([747817f](https://github.com/DucCuong159/Realtime-chatapp/commit/747817f65314ddf5b9854417e43368579f2066bd))
* display error toast on failed auth and limit auth attempts ([#26](https://github.com/DucCuong159/Realtime-chatapp/issues/26)) ([#51](https://github.com/DucCuong159/Realtime-chatapp/issues/51)) ([2795ea2](https://github.com/DucCuong159/Realtime-chatapp/commit/2795ea2b0c74bb6d6bbbd21b8b9b95054c90d02c))

## [1.1.0](https://github.com/DucCuong159/Realtime-chatapp/compare/realtime-chatapp-v1.0.0...realtime-chatapp-v1.1.0) (2026-08-24)


### Features

* **auth:** add register, login, logout, and auth status APIs ([#3](https://github.com/DucCuong159/Realtime-chatapp/issues/3)) ([9e280a7](https://github.com/DucCuong159/Realtime-chatapp/commit/9e280a7e1a507559ca615a4e1c11d0dd546041ba))
* **backend:** implement Gemini AI streaming response and seed script ([#19](https://github.com/DucCuong159/Realtime-chatapp/issues/19)) ([aa4e85d](https://github.com/DucCuong159/Realtime-chatapp/commit/aa4e85dc747a8bb5886ce4fe520b86542bf21e2e))
* **conversation:** implement single conversation detail view with real-time replies, media support and optimistic sorting ([#14](https://github.com/DucCuong159/Realtime-chatapp/issues/14)) ([28483a6](https://github.com/DucCuong159/Realtime-chatapp/commit/28483a6eb1c9570e83746943737e39d7455adc83))
* **frontend:** implement AsideBar navigation, avatar badge, and layout integration ([#12](https://github.com/DucCuong159/Realtime-chatapp/issues/12)) ([0572a97](https://github.com/DucCuong159/Realtime-chatapp/commit/0572a976ac34605e425685957fcfbe412eb8cba5))
* **frontend:** implement authentication flow, auth state management, and route protection ([#8](https://github.com/DucCuong159/Realtime-chatapp/issues/8)) ([e34d095](https://github.com/DucCuong159/Realtime-chatapp/commit/e34d095036a0cdd3d60b11eafc1fa403da890a0c))
* **frontend:** implement conversation list, creation flow, and responsive layout ([#13](https://github.com/DucCuong159/Realtime-chatapp/issues/13)) ([49b20d8](https://github.com/DucCuong159/Realtime-chatapp/commit/49b20d845b7f9b845ee8f68b1395b49afc2fa602))
* **frontend:** implement real-time AI message streaming and UI components ([#21](https://github.com/DucCuong159/Realtime-chatapp/issues/21)) ([6741111](https://github.com/DucCuong159/Realtime-chatapp/commit/67411118bf9fdde68ef308e3efd66bdabacbc65c))
* **frontend:** setup project architecture, shadcn/ui design system, layouts and routing ([#7](https://github.com/DucCuong159/Realtime-chatapp/issues/7)) ([dd350ec](https://github.com/DucCuong159/Realtime-chatapp/commit/dd350ecfe0763332a225629e5a357863d3324445))
* implement conversation module with model, controller, service, and routes ([#5](https://github.com/DucCuong159/Realtime-chatapp/issues/5)) ([8aa8a88](https://github.com/DucCuong159/Realtime-chatapp/commit/8aa8a8898601830d72a8a540767b0c35847017c9))
* implement single conversation detail view and real-time chat ([#15](https://github.com/DucCuong159/Realtime-chatapp/issues/15)) ([27abbbd](https://github.com/DucCuong159/Realtime-chatapp/commit/27abbbd33ee2dea717cf83e01a4c3b21c54188ec))
* implement user module with model, controller, service, and routes for retrieving users ([#4](https://github.com/DucCuong159/Realtime-chatapp/issues/4)) ([59b33fe](https://github.com/DucCuong159/Realtime-chatapp/commit/59b33fe7b30292587ea8044137a9e82be6b060ae))
* **setup:** Express server with MongoDB connection & Vite frontend ([#1](https://github.com/DucCuong159/Realtime-chatapp/issues/1)) ([65458c2](https://github.com/DucCuong159/Realtime-chatapp/commit/65458c2ab509b03485db98332b371f5c6f8c5631))
* **socket:** implement socket.io server with authentication, multi-tab online tracking, and realtime event emissions ([#6](https://github.com/DucCuong159/Realtime-chatapp/issues/6)) ([297de2c](https://github.com/DucCuong159/Realtime-chatapp/commit/297de2c4cb2bbac992e5b52a41f633bdf69561ec))


### Bug Fixes

* **ai:** synchronize multi-tab streaming placeholders and preserve message queue ordering ([#48](https://github.com/DucCuong159/Realtime-chatapp/issues/48)) ([d1d4de6](https://github.com/DucCuong159/Realtime-chatapp/commit/d1d4de6fc1d42d80d271e0c87d85d21e5b617a06))
* **ci:** use Yarn Classic v1.22.22 instead of Corepack/Yarn 4 ([#46](https://github.com/DucCuong159/Realtime-chatapp/issues/46)) ([80347ca](https://github.com/DucCuong159/Realtime-chatapp/commit/80347ca6d82342a9619cd792467779f948302521))
* **conversation:** prevent AI placeholder from inheriting user reply context ([#33](https://github.com/DucCuong159/Realtime-chatapp/issues/33)) ([#39](https://github.com/DucCuong159/Realtime-chatapp/issues/39)) ([cd48112](https://github.com/DucCuong159/Realtime-chatapp/commit/cd48112b391429d57134da7c7e3732b9502f705d))
* **conversation:** single conversation detail view and real-time chat ([#16](https://github.com/DucCuong159/Realtime-chatapp/issues/16)) ([1ba628c](https://github.com/DucCuong159/Realtime-chatapp/commit/1ba628ce0f6ea1937a88c09546cabb472d0fcd4e))
* **quality:** resolve all SonarCloud issues across backend and frontend ([#47](https://github.com/DucCuong159/Realtime-chatapp/issues/47)) ([c18fe5c](https://github.com/DucCuong159/Realtime-chatapp/commit/c18fe5c9a098fa8812605303457e53af2dc2acad))
