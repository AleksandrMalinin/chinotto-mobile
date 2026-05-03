# iOS App Store / TestFlight — bump версии и билда

В этом репозитории закоммичен нативный каталог **`ios/`**. **Только `app.json` / `package.json` недостаточно:** Apple читает **`CFBundleShortVersionString`** и **`CFBundleVersion`** из **`ios/Chinotto/Info.plist`** и настроек таргетов в Xcode. Если их не обновить, в Transporter/App Store Connect уйдёт старая версия (типичные ошибки **90062**, **90186**).

## Когда открывать этот чеклист

- Новый релиз или патч для App Store / TestFlight.
- Любая фраза вроде «поднять версию», «новый билд», «поезд закрыт», исправление ошибки про `CFBundleShortVersionString`.

## Чеклист (выполнить по порядку)

### 1. Маркетинговая версия (semver)

Согласовать одну строку версии (например `1.0.2`) и выставить везде одинаково:

| Место | Поле |
|--------|------|
| `package.json` | `"version"` |
| `app.json` | `expo.version` |

### 2. Номер билда (monotonic)

Увеличить относительно **последнего успешно загруженного** или требования Connect:

| Место | Поле |
|--------|------|
| `app.json` | `expo.ios.buildNumber` (строка, например `"5"`) |

### 3. Главный таргет приложения (обязательно)

Файл **`ios/Chinotto/Info.plist`**:

| Ключ | Должен совпадать с |
|------|---------------------|
| `CFBundleShortVersionString` | `expo.version` |
| `CFBundleVersion` | `expo.ios.buildNumber` |

### 4. Расширения и общие настройки Xcode

Файл **`ios/Chinotto.xcodeproj/project.pbxproj`** — для **каждого** релевантного таргета (приложение, Share extension, Widget extension и т.д.):

- **`MARKETING_VERSION`** = та же строка, что и `expo.version`.
- **`CURRENT_PROJECT_VERSION`** = тот же целочисленный билд, что и `CFBundleVersion` / `buildNumber` (в проекте исторически все таргеты выровнены одним числом).

Подсказка: поиск по файлу `MARKETING_VERSION` и `CURRENT_PROJECT_VERSION`.

### 5. Проверка перед сборкой

Из корня репозитория:

```bash
grep -A1 CFBundleShortVersionString ios/Chinotto/Info.plist
grep -A1 CFBundleVersion ios/Chinotto/Info.plist
grep MARKETING_VERSION ios/Chinotto.xcodeproj/project.pbxproj | sort -u
```

Убедиться, что нигде не осталось старой версии вроде `1.0.0`, если релиз уже `1.0.2`.

### 6. App Store Connect (не код)

- Для новой маркетинговой версии завести **версию приложения** (поезд), которая **не закрыта** для новых билдов.
- Прикрепить собранный билд к **правильной** версии (ошибка **90186** — часто из‑за попытки залить билд на закрытый поезд `1.0.0`, когда актуальна уже `1.0.1`).

## Если используете только Expo prebuild без коммита `ios/`

Тогда версии подтягиваются из конфига при prebuild; этот чеклист критичен именно когда **`ios/` в git** и билд идёт из него (EAS с репозиторием как есть).

## Связанные документы

- Paywall / биллинг не зависят от номера версии; см. `docs/billing/` при проблемах с IAP.
