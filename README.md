# DÖNEN DÜNYA

Yerçekimi parkuru. Karakter hep "ileri" koşar; sen sol/sağ yarıya dokunarak dünyayı döndürürsün.
Dönünce yerçekimi ve koşu yönü birlikte değişir: zemin duvar, duvar tavan olur.

## Nasıl oynanır
- Ekranın **sol yarısına** dokun: dünya sola döner.
- **Sağ yarısına** dokun: dünya sağa döner.
- Dikenlere değme, yeşil hedefe ulaş. Az dönüşle bitirirsen daha çok yıldız kazanırsın (par = en az dönüş).

## Dosyalar
- `App.js` ekran, animasyon ve oyun döngüsü
- `engine.js` fizik ve kurallar (ekrandan bağımsız)
- `sound.js` ses efektleri (dosya yok, kodla üretilir)
- `levels.js` bölümler (11x11 kare olmalı) (`#` duvar, `^` diken, `G` hedef, `S` başlangıç)
- `tools/solve.js` bölümlerin çözülebilir olduğunu ve par değerini kontrol eder: `node tools/solve.js`
- `tools/robust.js` bölümün ne kadar affedici olduğunu ölçer (dokunuş zamanı ±0.2 sn kayınca başarı yüzdesi)

Expo Snack'e git deposundan aktarılabilir.
