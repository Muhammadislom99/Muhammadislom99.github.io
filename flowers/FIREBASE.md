# Общие отметки ухода через Firebase (бесплатно)

Нужны аккаунт Google и около 10 минут. Банковская карта не требуется (тариф Spark).

1. Откройте https://console.firebase.google.com → **Add project** → любое имя (например `office-flowers`). Google Analytics можно отключить.
2. В проекте: **Build → Firestore Database → Create database**. Режим — **Production**, регион любой (например `eur3`).
3. Вкладка **Rules** → замените содержимое на файл `flowers/firestore.rules` из репозитория → **Publish**.
4. **Project settings** (шестерёнка) → **General** → внизу **Your apps** → иконка `</>` (Web) → зарегистрируйте приложение (Hosting не нужен). Из показанного `firebaseConfig` понадобятся `apiKey` и `projectId`.
5. Впишите их в `flowers/config.js` и закоммитьте:
   ```js
   window.FLOWERS_SYNC={apiKey:'AIza...',projectId:'office-flowers'};
   ```
6. (Рекомендуется) В Google Cloud Console → **APIs & Services → Credentials** → ключ Browser key → **HTTP referrers** → добавьте `https://muhammadislom99.github.io/*`. Так ключ не сработает с чужих сайтов.

Ключ в `config.js` публичный — это нормально для Firebase. От записи лишнего защищает `firestore.rules`: разрешены только записи вида `<цветок>_w` / `<цветок>_f` с полями `d`, `by`, `t`, удалять нельзя.

Пока `config.js` пуст, сайт работает как раньше: отметки хранятся только в браузере.
