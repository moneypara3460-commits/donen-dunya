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
- `levels.js` bölümler (`#` duvar, `^` diken, `G` hedef, `S` başlangıç)
- `tools/solve.js` bölümlerin çözülebilir olduğunu ve par değerini kontrol eder: `node tools/solve.js`

Expo Snack'e git deposundan aktarılabilir.
